import type { SupabaseClient } from "@supabase/supabase-js";

import type { TenantRole } from "@/lib/constants";
import { createDescontoService } from "@/lib/descontos/desconto-service";
import { PRODUTO_TIPOS_SEM_ESTOQUE } from "@/lib/estoque/constants";
import { createClienteService } from "@/lib/clientes/cliente-service";
import { calcItemMargem, calcVendaTotais } from "@/lib/vendas/format";
import type { VendaRapidaFormValues } from "@/lib/vendas/venda-rapida-validations";
import { createVendaService } from "@/lib/vendas/venda-service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ProdutoBalcao = {
  id: string;
  nome: string;
  sku: string | null;
  codigo_barras: string | null;
  preco_venda: number;
  custo: number | null;
  estoque_atual: number;
  tipo: string;
  unidade_medida: string | null;
};

export class VendaRapidaService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async ensureConsumidorBalcao(): Promise<string> {
    const { data, error } = await this.supabase.rpc("ensure_consumidor_balcao", {
      p_tenant_id: this.tenantId,
    });
    if (!error && data) return data;

    // fallback se RPC ainda não aplicada
    const { data: existing } = await this.supabase
      .from("clientes")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("origem", "sistema_balcao")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data: created, error: cErr } = await this.supabase
      .from("clientes")
      .insert({
        tenant_id: this.tenantId,
        nome: "Consumidor não identificado",
        tipo_pessoa: "pf",
        origem: "sistema_balcao",
        ativo: true,
        observacoes: "Cliente sistema para vendas de balcão.",
      })
      .select("id")
      .single();

    if (cErr) throw new Error(cErr.message);
    return created.id;
  }

  async findProdutoByCodigo(codigo: string): Promise<ProdutoBalcao | null> {
    const term = codigo.trim();
    if (!term) return null;

    const { data, error } = await this.supabase
      .from("produtos")
      .select(
        "id, nome, sku, codigo_barras, preco_venda, custo, estoque_atual, tipo, unidade_medida",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .or(
        `codigo_barras.eq.${term},sku.eq.${term},codigo_interno.eq.${term}`,
      )
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
      id: data.id,
      nome: data.nome,
      sku: data.sku,
      codigo_barras: data.codigo_barras,
      preco_venda: Number(data.preco_venda ?? 0),
      custo: data.custo != null ? Number(data.custo) : null,
      estoque_atual: Number(data.estoque_atual ?? 0),
      tipo: data.tipo,
      unidade_medida: data.unidade_medida,
    };
  }

  async listProdutosBalcao(limit = 300): Promise<ProdutoBalcao[]> {
    const { data, error } = await this.supabase
      .from("produtos")
      .select(
        "id, nome, sku, codigo_barras, preco_venda, custo, estoque_atual, tipo, unidade_medida",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .neq("tipo", "servico")
      .order("nome")
      .limit(limit);

    if (error) throw new Error(error.message);

    return (data ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      sku: p.sku,
      codigo_barras: p.codigo_barras,
      preco_venda: Number(p.preco_venda ?? 0),
      custo: p.custo != null ? Number(p.custo) : null,
      estoque_atual: Number(p.estoque_atual ?? 0),
      tipo: p.tipo,
      unidade_medida: p.unidade_medida,
    }));
  }

  async concluir(
    input: VendaRapidaFormValues,
    opts: {
      userId: string | null;
      role: TenantRole;
      allowSaldoNegativo: boolean;
      allowAbaixoMargem: boolean;
    },
  ) {
    let clienteId: string;
    let consumidorNI = false;

    if (input.modo_cliente === "nao_identificado") {
      clienteId = await this.ensureConsumidorBalcao();
      consumidorNI = true;
    } else if (input.modo_cliente === "rapido" && input.cliente_rapido) {
      const clienteSvc = await createClienteService(this.tenantId);
      const dup = await clienteSvc.checkDuplicates({
        documento: input.cliente_rapido.documento,
        telefone: input.cliente_rapido.telefone,
      });

      if (dup.hasDuplicates && !input.force_create_cliente) {
        return {
          kind: "duplicate" as const,
          duplicates: dup.matches.map((m) => ({
            id: m.id,
            nome: m.label,
            matched_on: m.matchedOn.join(", "),
          })),
        };
      }

      if (dup.hasDuplicates && input.force_create_cliente) {
        // caller must have checked permission
      }

      let clienteIdCriado: string;
      try {
        const criado = await clienteSvc.create(
          {
            nome: input.cliente_rapido.nome,
            telefone: input.cliente_rapido.telefone ?? null,
            documento: input.cliente_rapido.documento ?? null,
            tipo_pessoa: "pf",
            origem: "venda_balcao",
            ativo: true,
          },
          opts.userId,
          { skipDuplicateCheck: Boolean(input.force_create_cliente) },
        );
        clienteIdCriado = criado.id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/duplicidade|CPF\/CNPJ/i.test(msg) && !input.force_create_cliente) {
          const again = await clienteSvc.checkDuplicates({
            documento: input.cliente_rapido.documento,
            telefone: input.cliente_rapido.telefone,
          });
          return {
            kind: "duplicate" as const,
            duplicates: again.matches.map((m) => ({
              id: m.id,
              nome: m.label,
              matched_on: m.matchedOn.join(", "),
            })),
          };
        }
        throw err;
      }
      clienteId = clienteIdCriado;
    } else {
      if (!input.cliente_id) throw new Error("Selecione o cliente.");
      clienteId = input.cliente_id;
    }

    const produtoIds = input.itens.map((i) => i.produto_id);
    const { data: produtos, error: pErr } = await this.supabase
      .from("produtos")
      .select("id, nome, tipo, custo, estoque_atual, preco_venda")
      .eq("tenant_id", this.tenantId)
      .in("id", produtoIds)
      .is("deleted_at", null);

    if (pErr) throw new Error(pErr.message);
    const map = new Map((produtos ?? []).map((p) => [p.id, p]));

    const alerts: string[] = [];
    for (const item of input.itens) {
      const p = map.get(item.produto_id);
      if (!p) throw new Error("Produto inválido.");
      if (PRODUTO_TIPOS_SEM_ESTOQUE.includes(p.tipo as "servico")) continue;

      const estoque = Number(p.estoque_atual ?? 0);
      if (estoque <= 0) alerts.push(`${p.nome}: sem estoque`);
      else if (estoque < item.quantidade) {
        alerts.push(
          `${p.nome}: estoque insuficiente (${estoque} disponível)`,
        );
      }
      if (p.custo == null || Number(p.custo) <= 0) {
        alerts.push(`${p.nome}: sem custo cadastrado`);
      }
      const custo = Number(p.custo ?? 0);
      if (custo > 0 && item.preco_unitario < custo) {
        alerts.push(`${p.nome}: venda abaixo do custo`);
      }
    }

    if (alerts.some((a) => a.includes("insuficiente") || a.includes("sem estoque"))) {
      if (!opts.allowSaldoNegativo) {
        throw new Error(alerts.filter((a) => a.includes("estoque")).join(" · "));
      }
    }

    const totais = calcVendaTotais(
      input.itens.map((i) => ({
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        desconto: i.desconto,
        custo_unitario: map.get(i.produto_id)?.custo != null
          ? Number(map.get(i.produto_id)!.custo)
          : null,
      })),
      0,
    );

    let descontoTotal = Number(input.desconto_total) || 0;
    if (input.desconto_percentual > 0 && descontoTotal <= 0) {
      descontoTotal = Number(
        ((totais.subtotal * input.desconto_percentual) / 100).toFixed(2),
      );
    }

    const custoTotal = input.itens.reduce((sum, i) => {
      const c = Number(map.get(i.produto_id)?.custo ?? 0);
      return sum + c * i.quantidade;
    }, 0);
    const receitaApos = totais.subtotal - descontoTotal;
    const margemPct =
      receitaApos > 0
        ? Number((((receitaApos - custoTotal) / receitaApos) * 100).toFixed(2))
        : 0;

    let descontoPendente = false;
    if (descontoTotal > 0) {
      const descontoSvc = await createDescontoService(this.tenantId);
      const avaliacao = await descontoSvc.avaliarAsync({
        valorOriginal: totais.subtotal,
        descontoValor: descontoTotal,
        descontoPercentual: input.desconto_percentual,
        margemPercentual: margemPct,
        motivo: input.desconto_motivo ?? "",
        tipo: input.desconto_tipo ?? "outro",
        solicitanteId: opts.userId,
        role: opts.role,
      });

      if (avaliacao.status === "bloqueado") {
        throw new Error(avaliacao.motivoBloqueio);
      }
      if (avaliacao.status === "pendente_aprovacao") {
        descontoPendente = true;
        descontoTotal = avaliacao.valorDesconto;
      } else {
        descontoTotal = avaliacao.valorDesconto;
      }
    }

    for (const item of input.itens) {
      const p = map.get(item.produto_id)!;
      const margem = calcItemMargem(
        item.quantidade,
        item.preco_unitario,
        p.custo != null ? Number(p.custo) : null,
        item.desconto,
      );
      if (margem != null && margem < 0 && !opts.allowAbaixoMargem && !descontoPendente) {
        throw new Error(
          `${p.nome}: margem negativa. Solicite autorização para vender abaixo do custo.`,
        );
      }
    }

    const vendaSvc = await createVendaService(this.tenantId);
    const venda = await vendaSvc.create(
      {
        cliente_id: clienteId,
        data_venda: new Date().toISOString().slice(0, 10),
        status: descontoPendente ? "orcamento" : "em_andamento",
        desconto_total: descontoPendente ? 0 : descontoTotal,
        forma_pagamento_id: input.forma_pagamento_id,
        quantidade_parcelas: 1,
        observacoes: input.observacoes ?? null,
        itens: input.itens.map((i) => ({
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          desconto: i.desconto,
        })),
      },
      opts.userId,
    );

    await this.supabase
      .from("vendas")
      .update({
        canal_venda: "balcao",
        consumidor_nao_identificado: consumidorNI,
        vendedor_id: opts.userId,
        desconto_motivo: input.desconto_motivo ?? null,
        desconto_tipo: input.desconto_tipo ?? null,
        desconto_percentual: input.desconto_percentual,
        desconto_autorizado_por:
          descontoTotal > 0 && !descontoPendente ? opts.userId : null,
      })
      .eq("id", venda.id)
      .eq("tenant_id", this.tenantId);

    if (input.pagamentos?.length) {
      const { createVendaPagamentoService } = await import(
        "@/lib/vendas/venda-pagamento-service"
      );
      const paySvc = await createVendaPagamentoService(this.tenantId);
      const totalFinal = Number((totais.subtotal - (descontoPendente ? 0 : descontoTotal)).toFixed(2));
      await paySvc.replacePagamentos(venda.id, input.pagamentos, totalFinal);
    }

    if (descontoTotal > 0) {
      const descontoSvc = await createDescontoService(this.tenantId);
      await descontoSvc.recordEvent({
        entidadeTipo: "venda",
        entidadeId: venda.id,
        clienteId: consumidorNI ? null : clienteId,
        solicitanteId: opts.userId,
        autorizadorId: descontoPendente ? null : opts.userId,
        valorOriginal: totais.subtotal,
        valorDesconto: descontoTotal,
        percentual:
          totais.subtotal > 0
            ? Number(((descontoTotal / totais.subtotal) * 100).toFixed(4))
            : 0,
        valorFinal: Number((totais.subtotal - descontoTotal).toFixed(2)),
        margemAntes: totais.margem_total,
        margemDepois: Number((receitaApos - custoTotal).toFixed(2)),
        tipoDesconto: input.desconto_tipo,
        motivo: input.desconto_motivo ?? "Desconto balcão",
        status: descontoPendente ? "pendente" : "aprovado",
      });
    }

    if (descontoPendente) {
      alerts.push(
        "Desconto enviado para aprovação superior. Venda salva como orçamento.",
      );
      return { kind: "ok" as const, vendaId: venda.id, alerts, pendingApproval: true };
    }

    if (input.pagamentos && input.pagamentos.length > 1) {
      const { createVendaPagamentoService } = await import(
        "@/lib/vendas/venda-pagamento-service"
      );
      const paySvc = await createVendaPagamentoService(this.tenantId);
      try {
        await paySvc.faturarComPagamentos(venda.id, opts.userId);
      } catch {
        // RPC ainda não aplicada → fallback
        if (input.receber_agora && input.conta_bancaria_id) {
          await vendaSvc.faturarEReceber(
            venda.id,
            input.conta_bancaria_id,
            opts.userId,
          );
        } else {
          await vendaSvc.faturar(venda.id, opts.userId);
        }
      }
    } else if (input.receber_agora && input.conta_bancaria_id) {
      await vendaSvc.faturarEReceber(
        venda.id,
        input.conta_bancaria_id,
        opts.userId,
      );
    } else {
      await vendaSvc.faturar(venda.id, opts.userId);
    }

    return { kind: "ok" as const, vendaId: venda.id, alerts };
  }
}

export async function createVendaRapidaService(tenantId: string) {
  const supabase = await createClient();
  return new VendaRapidaService(supabase, tenantId);
}
