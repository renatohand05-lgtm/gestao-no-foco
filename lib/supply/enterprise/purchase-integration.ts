/**
 * Sprint 25.1 — Integração pedido → Estoque + Finance Core.
 * Elimina falso sucesso: só marca integrado após persistir efeitos.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { EstoqueService } from "@/lib/estoque/estoque-service";
import { ContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import type { Database } from "@/types/database";

import { supplyClient } from "./supabase-table.ts";

type Client = SupabaseClient<Database>;

function db(client: Client) {
  return supplyClient(client);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type PurchaseIntegrationResult = {
  stock: { moved: number; skipped: number; errors: string[] };
  finance: {
    created: boolean;
    contaPagarId: string | null;
    skippedReason: string | null;
  };
};

/**
 * Integra pedido no status → integrado.
 * Idempotente: reentrada não duplica AP nem movimentações (idempotency_key / compra_pedido_id).
 */
export async function integratePurchaseOrderSideEffects(
  client: Client,
  args: {
    tenantId: string;
    userId: string;
    pedidoId: string;
  },
): Promise<PurchaseIntegrationResult> {
  const { data: pedido, error } = await db(client)
    .from("compras_pedidos")
    .select(
      "id, tenant_id, status, fornecedor_id, valor_total, integrado_estoque_em, integrado_financeiro_em, numero",
    )
    .eq("id", args.pedidoId)
    .eq("tenant_id", args.tenantId)
    .is("deleted_at", null)
    .single();

  if (error) throw new Error(error.message);
  if (!pedido) throw new Error("Pedido não encontrado.");

  const { data: itens, error: itemErr } = await db(client)
    .from("compras_pedido_itens")
    .select("id, produto_id, quantidade, quantidade_recebida, preco_unitario")
    .eq("tenant_id", args.tenantId)
    .eq("pedido_id", args.pedidoId);

  if (itemErr) throw new Error(itemErr.message);

  const lines = itens ?? [];
  const stock = { moved: 0, skipped: 0, errors: [] as string[] };
  const estoqueSvc = new EstoqueService(client, args.tenantId);

  for (const line of lines) {
    const pedida = Number(line.quantidade);
    const recebida = Number(line.quantidade_recebida ?? 0);
    const pendente = pedida - recebida;
    if (!(pendente > 0)) {
      stock.skipped += 1;
      continue;
    }

    const idempotencyKey = `compra:${args.pedidoId}:item:${line.id}:entrada`;

    // Idempotência por documento_ref / origem
    const { data: existingMov } = await client
      .from("estoque_movimentacoes")
      .select("id")
      .eq("tenant_id", args.tenantId)
      .eq("produto_id", line.produto_id)
      .eq("origem", "compras")
      .ilike("observacoes", `%${idempotencyKey}%`)
      .is("deleted_at", null)
      .limit(1);

    if (existingMov && existingMov.length > 0) {
      stock.skipped += 1;
      continue;
    }

    try {
      await estoqueSvc.createMovimentacao(
        {
          produto_id: line.produto_id,
          tipo: "entrada",
          quantidade: pendente,
          motivo: "Recebimento pedido de compra",
          origem: "compras",
          observacoes: idempotencyKey,
          custo_unitario_entrada:
            line.preco_unitario == null ? null : Number(line.preco_unitario),
        },
        args.userId,
      );

      await db(client)
        .from("compras_pedido_itens")
        .update({ quantidade_recebida: pedida })
        .eq("id", line.id)
        .eq("tenant_id", args.tenantId);

      stock.moved += 1;
    } catch (e) {
      stock.errors.push(
        e instanceof Error ? e.message : "Falha ao movimentar estoque",
      );
    }
  }

  if (stock.errors.length > 0 && stock.moved === 0 && lines.length > 0) {
    throw new Error(
      `Integração de estoque falhou: ${stock.errors.join("; ")}`,
    );
  }

  const finance: PurchaseIntegrationResult["finance"] = {
    created: false,
    contaPagarId: null,
    skippedReason: null,
  };

  // Idempotência Finance: já existe AP vinculada?
  const { data: existingAp } = await client
    .from("contas_pagar")
    .select("id")
    .eq("tenant_id", args.tenantId)
    .eq("compra_pedido_id", args.pedidoId)
    .is("deleted_at", null)
    .limit(1);

  if (existingAp && existingAp.length > 0) {
    finance.skippedReason = "Conta a pagar já vinculada ao pedido (idempotente).";
    finance.contaPagarId = existingAp[0]!.id;
  } else if (!pedido.fornecedor_id) {
    finance.skippedReason =
      "Pedido sem fornecedor — conta a pagar não criada. Informe fornecedor e reintegre.";
  } else {
    const { data: forn, error: fornErr } = await client
      .from("fornecedores")
      .select(
        "id, nome, categoria_financeira_id, centro_custo_id, plano_conta_id, forma_pagamento_id, prazo_medio_dias",
      )
      .eq("tenant_id", args.tenantId)
      .eq("id", pedido.fornecedor_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (fornErr) throw new Error(fornErr.message);

    if (
      !forn?.categoria_financeira_id ||
      !forn.centro_custo_id ||
      !forn.plano_conta_id
    ) {
      finance.skippedReason =
        "Fornecedor sem classificação financeira (categoria/centro/plano). Cadastre no Finance Core antes de integrar AP.";
    } else {
      const valor =
        pedido.valor_total != null && Number.isFinite(Number(pedido.valor_total))
          ? Number(pedido.valor_total)
          : lines.reduce((s, l) => {
              const p = l.preco_unitario == null ? 0 : Number(l.preco_unitario);
              return s + p * Number(l.quantidade);
            }, 0);

      if (!(valor > 0)) {
        finance.skippedReason =
          "Valor do pedido indisponível — AP não criada (não inventar valor).";
      } else {
        const prazo = forn.prazo_medio_dias ?? 30;
        const apSvc = new ContaPagarService(client, args.tenantId);
        const created = await apSvc.create({
          fornecedor_id: forn.id,
          fornecedor_nome: forn.nome,
          forma_pagamento_id: forn.forma_pagamento_id,
          categoria_financeira_id: forn.categoria_financeira_id,
          centro_custo_id: forn.centro_custo_id,
          plano_conta_id: forn.plano_conta_id,
          descricao: `Pedido de compra #${pedido.numero ?? pedido.id.slice(0, 8)}`,
          valor_original: valor,
          data_emissao: todayIsoDate(),
          data_competencia: todayIsoDate(),
          data_vencimento: addDaysIso(Math.max(0, prazo)),
          observacoes: `Origem Supply: compra_pedido_id=${pedido.id}`,
        });

        // Vincular idempotência (coluna Sprint 25.1)
        const { error: linkErr } = await client
          .from("contas_pagar")
          .update({ compra_pedido_id: pedido.id } as never)
          .eq("id", created.id)
          .eq("tenant_id", args.tenantId);

        if (linkErr) {
          // Se coluna ainda não existe, AP foi criada — documentar sem falso sucesso total
          finance.skippedReason = `AP criada (${created.id}) sem vínculo compra_pedido_id: ${linkErr.message}. Aplique migration 20260813.`;
        }

        finance.created = true;
        finance.contaPagarId = created.id;
      }
    }
  }

  return { stock, finance };
}
