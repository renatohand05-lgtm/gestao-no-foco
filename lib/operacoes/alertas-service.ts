import type { SupabaseClient } from "@supabase/supabase-js";

import { OS_STATUS_TERMINAL } from "@/lib/operacoes/metricas";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type OperacaoAlerta = {
  id: string;
  tipo: string;
  severidade: "critico" | "alto" | "medio" | "informativo";
  titulo: string;
  descricao: string | null;
  origemTipo: string | null;
  origemId: string | null;
  href: string | null;
  tratado: boolean;
  tratadoEm: string | null;
  responsavelId: string | null;
  observacao: string | null;
  createdAt: string;
  persistido: boolean;
};

type DraftAlerta = {
  chave: string;
  tipo: string;
  severidade: OperacaoAlerta["severidade"];
  titulo: string;
  descricao: string | null;
  origemTipo: string | null;
  origemId: string | null;
  href: string | null;
};

export class AlertasOperacionaisService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
    private readonly tenantSlug: string,
  ) {}

  /** Gera drafts e faz upsert persistente (chave_unica). */
  async syncAndList(opts?: {
    incluirTratados?: boolean;
  }): Promise<OperacaoAlerta[]> {
    const drafts = await this.collectDrafts();
    await this.upsertDrafts(drafts);
    return this.listPersisted(opts?.incluirTratados ?? false);
  }

  async listPersisted(incluirTratados: boolean): Promise<OperacaoAlerta[]> {
    let query = this.supabase
      .from("operacao_alertas")
      .select(
        "id, tipo, severidade, titulo, descricao, origem_tipo, origem_id, tratado, tratado_em, responsavel_id, observacao, created_at, chave_unica",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(150);

    if (!incluirTratados) query = query.eq("tratado", false);

    const { data, error } = await query;
    if (error) {
      // tabela/coluna Gate 2 ausente → fallback só drafts
      const drafts = await this.collectDrafts();
      return drafts.map((d) => ({
        id: d.chave,
        tipo: d.tipo,
        severidade: d.severidade,
        titulo: d.titulo,
        descricao: d.descricao,
        origemTipo: d.origemTipo,
        origemId: d.origemId,
        href: d.href,
        tratado: false,
        tratadoEm: null,
        responsavelId: null,
        observacao: null,
        createdAt: new Date().toISOString(),
        persistido: false,
      }));
    }

    return (data ?? []).map((a) => ({
      id: a.id,
      tipo: a.tipo,
      severidade: a.severidade as OperacaoAlerta["severidade"],
      titulo: a.titulo,
      descricao: a.descricao,
      origemTipo: a.origem_tipo,
      origemId: a.origem_id,
      href: this.hrefFor(a.origem_tipo, a.origem_id),
      tratado: a.tratado,
      tratadoEm: a.tratado_em,
      responsavelId: a.responsavel_id,
      observacao: a.observacao,
      createdAt: a.created_at,
      persistido: true,
    }));
  }

  async tratar(
    id: string,
    userId: string | null,
    observacao?: string | null,
    responsavelId?: string | null,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("operacao_alertas")
      .update({
        tratado: true,
        tratado_em: new Date().toISOString(),
        tratado_por: userId,
        observacao: observacao ?? null,
        responsavel_id: responsavelId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw new Error(error.message);
    await this.logEvento(id, "tratado", observacao ?? "Marcado como tratado", userId);
  }

  async reabrir(id: string, userId: string | null, observacao?: string | null): Promise<void> {
    const { error } = await this.supabase
      .from("operacao_alertas")
      .update({
        tratado: false,
        tratado_em: null,
        tratado_por: null,
        observacao: observacao ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw new Error(error.message);
    await this.logEvento(id, "reaberto", observacao ?? "Alerta reaberto", userId);
  }

  private async logEvento(
    alertaId: string,
    tipo: string,
    descricao: string,
    userId: string | null,
  ) {
    await this.supabase.from("operacao_alerta_eventos" as never).insert({
      tenant_id: this.tenantId,
      alerta_id: alertaId,
      tipo,
      descricao,
      created_by: userId,
    } as never);
  }

  private hrefFor(origemTipo: string | null, origemId: string | null) {
    if (!origemTipo || !origemId) return null;
    if (origemTipo === "ordem_servico") {
      return `/${this.tenantSlug}/ordens/${origemId}`;
    }
    if (origemTipo === "produto") {
      return `/${this.tenantSlug}/produtos/${origemId}`;
    }
    if (origemTipo === "conta_receber") {
      return `/${this.tenantSlug}/financeiro/contas-receber/${origemId}`;
    }
    if (origemTipo === "recurso") {
      return `/${this.tenantSlug}/centro-operacoes/recursos`;
    }
    return null;
  }

  private async upsertDrafts(drafts: DraftAlerta[]) {
    for (const d of drafts.slice(0, 80)) {
      const { data: existing } = await this.supabase
        .from("operacao_alertas")
        .select("id, tratado")
        .eq("tenant_id", this.tenantId)
        .eq("chave_unica", d.chave)
        .is("deleted_at", null)
        .maybeSingle();

      if (existing?.id) {
        if (existing.tratado) continue; // não reabrir automaticamente
        await this.supabase
          .from("operacao_alertas")
          .update({
            titulo: d.titulo,
            descricao: d.descricao,
            severidade: d.severidade,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        continue;
      }

      const { error } = await this.supabase.from("operacao_alertas").insert({
        tenant_id: this.tenantId,
        chave_unica: d.chave,
        tipo: d.tipo,
        severidade: d.severidade,
        titulo: d.titulo,
        descricao: d.descricao,
        origem_tipo: d.origemTipo,
        origem_id: d.origemId,
        tratado: false,
      });
      if (error && /does not exist|chave_unica/i.test(error.message)) {
        break;
      }
    }
  }

  private async collectDrafts(): Promise<DraftAlerta[]> {
    const hoje = new Date().toISOString().slice(0, 10);
    const limiar48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const drafts: DraftAlerta[] = [];

    const { data: osRows } = await this.supabase
      .from("ordens_servico")
      .select(
        "id, numero, status, previsao_entrega, updated_at, cliente:clientes(nome)",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .limit(300);

    for (const o of osRows ?? []) {
      if (OS_STATUS_TERMINAL.has(o.status)) continue;
      const cliente =
        (o.cliente as unknown as { nome: string } | null)?.nome ?? "Cliente";
      if (o.previsao_entrega && o.previsao_entrega.slice(0, 10) < hoje) {
        drafts.push({
          chave: `os_atrasada:${o.id}`,
          tipo: "os_atrasada",
          severidade: "critico",
          titulo: `OS #${o.numero} atrasada`,
          descricao: `${cliente} — prazo ${o.previsao_entrega.slice(0, 10)}`,
          origemTipo: "ordem_servico",
          origemId: o.id,
          href: `/${this.tenantSlug}/ordens/${o.id}`,
        });
      }
      if (o.updated_at < limiar48h) {
        drafts.push({
          chave: `os_sem_atualizacao:${o.id}`,
          tipo: "os_sem_atualizacao",
          severidade: "alto",
          titulo: `OS #${o.numero} sem atualização`,
          descricao: `${cliente} — mais de 48h sem mudança`,
          origemTipo: "ordem_servico",
          origemId: o.id,
          href: `/${this.tenantSlug}/ordens/${o.id}`,
        });
      }
      if (o.status === "aguardando_aprovacao") {
        drafts.push({
          chave: `aguardando_aprovacao:${o.id}`,
          tipo: "aguardando_aprovacao",
          severidade: "medio",
          titulo: `OS #${o.numero} aguarda aprovação`,
          descricao: cliente,
          origemTipo: "ordem_servico",
          origemId: o.id,
          href: `/${this.tenantSlug}/ordens/${o.id}`,
        });
      }
      if (o.status === "aguardando_peca") {
        drafts.push({
          chave: `aguardando_pecas:${o.id}`,
          tipo: "aguardando_pecas",
          severidade: "alto",
          titulo: `OS #${o.numero} aguarda peças`,
          descricao: cliente,
          origemTipo: "ordem_servico",
          origemId: o.id,
          href: `/${this.tenantSlug}/ordens/${o.id}`,
        });
      }
    }

    const { data: produtos } = await this.supabase
      .from("produtos")
      .select("id, nome, estoque_atual, estoque_minimo, tipo")
      .eq("tenant_id", this.tenantId)
      .eq("ativo", true)
      .is("deleted_at", null)
      .neq("tipo", "servico")
      .limit(500);

    for (const p of produtos ?? []) {
      const est = Number(p.estoque_atual ?? 0);
      const min = Number(p.estoque_minimo ?? 0);
      if (est <= 0) {
        drafts.push({
          chave: `estoque_zerado:${p.id}`,
          tipo: "estoque_zerado",
          severidade: "critico",
          titulo: `Produto zerado: ${p.nome}`,
          descricao: "Sem estoque disponível",
          origemTipo: "produto",
          origemId: p.id,
          href: `/${this.tenantSlug}/produtos/${p.id}`,
        });
      } else if (min > 0 && est <= min) {
        drafts.push({
          chave: `estoque_critico:${p.id}`,
          tipo: "estoque_critico",
          severidade: "alto",
          titulo: `Estoque baixo: ${p.nome}`,
          descricao: `Atual ${est} · mínimo ${min}`,
          origemTipo: "produto",
          origemId: p.id,
          href: `/${this.tenantSlug}/produtos/${p.id}`,
        });
      }
    }

    const { data: crs } = await this.supabase
      .from("contas_receber")
      .select("id, numero, data_vencimento, valor_original, valor_recebido")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .in("status", ["aberto", "parcial", "vencido"])
      .lt("data_vencimento", hoje)
      .limit(50);

    for (const c of crs ?? []) {
      const saldo = Number(c.valor_original) - Number(c.valor_recebido ?? 0);
      if (saldo <= 0) continue;
      drafts.push({
        chave: `conta_vencida:${c.id}`,
        tipo: "conta_vencida",
        severidade: "critico",
        titulo: `Conta a receber vencida #${c.numero}`,
        descricao: `Saldo ${saldo.toFixed(2)} · venc. ${c.data_vencimento}`,
        origemTipo: "conta_receber",
        origemId: c.id,
        href: `/${this.tenantSlug}/financeiro/contas-receber/${c.id}`,
      });
    }

    const { data: recursos } = await this.supabase
      .from("oficina_recursos")
      .select("id, nome, status")
      .eq("tenant_id", this.tenantId)
      .eq("status", "manutencao")
      .is("deleted_at", null)
      .limit(50);

    for (const r of recursos ?? []) {
      drafts.push({
        chave: `recurso_manutencao:${r.id}`,
        tipo: "recurso_manutencao",
        severidade: "medio",
        titulo: `Recurso em manutenção: ${r.nome}`,
        descricao: null,
        origemTipo: "recurso",
        origemId: r.id,
        href: `/${this.tenantSlug}/centro-operacoes/recursos`,
      });
    }

    // Descontos altos / margem baixa (amostra recente)
    const { data: vendas } = await this.supabase
      .from("vendas")
      .select("id, numero, desconto_total, total, margem_total, status")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("status", "faturado")
      .order("created_at", { ascending: false })
      .limit(40);

    for (const v of vendas ?? []) {
      const total = Number(v.total ?? 0);
      const desc = Number(v.desconto_total ?? 0);
      const margem = Number(v.margem_total ?? 0);
      if (total > 0 && desc / total >= 0.15) {
        drafts.push({
          chave: `desconto_alto:${v.id}`,
          tipo: "desconto_alto",
          severidade: "alto",
          titulo: `Desconto elevado na venda #${v.numero}`,
          descricao: `${((desc / total) * 100).toFixed(0)}% de desconto`,
          origemTipo: "venda",
          origemId: v.id,
          href: `/${this.tenantSlug}/vendas/${v.id}`,
        });
      }
      if (total > 0 && margem / total < 0.1) {
        drafts.push({
          chave: `margem_baixa:${v.id}`,
          tipo: "venda_abaixo_margem",
          severidade: "alto",
          titulo: `Venda #${v.numero} abaixo da margem`,
          descricao: `Margem ${((margem / total) * 100).toFixed(0)}%`,
          origemTipo: "venda",
          origemId: v.id,
          href: `/${this.tenantSlug}/vendas/${v.id}`,
        });
      }
    }

    return drafts;
  }
}

export async function createAlertasOperacionaisService(
  tenantId: string,
  tenantSlug: string,
) {
  const supabase = await createClient();
  return new AlertasOperacionaisService(supabase, tenantId, tenantSlug);
}
