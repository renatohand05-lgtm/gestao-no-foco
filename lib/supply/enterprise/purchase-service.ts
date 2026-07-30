/**
 * Fase 25 — Pedidos de compra (Supabase + workflow puro).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import {
  assertPurchaseStatus,
  assertPurchaseTransition,
  sumPurchaseLines,
  validatePurchaseLines,
  type PurchaseLineDraft,
} from "./purchase-workflow.ts";
import { supplyClient } from "./supabase-table.ts";
import type { PurchaseWorkflowStatus } from "./types.ts";

type Client = SupabaseClient<Database>;

function db(client: Client) {
  return supplyClient(client);
}

function isMissingRelation(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table")
  );
}

export async function probePurchaseSchema(client: Client, tenantId: string) {
  const { error } = await db(client)
    .from("compras_pedidos")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1);
  if (error && isMissingRelation(error.message)) {
    return { ready: false as const, message: error.message };
  }
  if (error) throw new Error(error.message);
  return { ready: true as const, message: "ok" };
}

export async function listPurchaseOrders(
  client: Client,
  tenantId: string,
  opts?: { status?: string; limit?: number },
) {
  let q = db(client)
    .from("compras_pedidos")
    .select(
      "id, tenant_id, status, fornecedor_id, valor_total, data_necessidade, created_at, numero, empresa_id, filial_id",
    )
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.status) q = q.eq("status", opts.status);

  const { data, error } = await q;
  if (error) {
    if (isMissingRelation(error.message)) {
      return {
        rows: [] as Array<{
          id: string;
          tenant_id: string;
          status: string;
          fornecedor_id: string | null;
          valor_total: number | null;
          data_necessidade: string | null;
          created_at: string;
          numero: number | null;
          empresa_id: string | null;
          filial_id: string | null;
        }>,
        ready: false as const,
      };
    }
    throw new Error(error.message);
  }
  return { rows: data ?? [], ready: true as const };
}

export async function createPurchaseOrder(
  client: Client,
  args: {
    tenantId: string;
    userId: string;
    fornecedorId?: string | null;
    empresaId?: string | null;
    filialId?: string | null;
    dataNecessidade?: string | null;
    observacoes?: string | null;
    lines: PurchaseLineDraft[];
  },
) {
  const lineErrors = validatePurchaseLines(args.lines);
  if (lineErrors.length) throw new Error(lineErrors.join(" "));

  const valor = sumPurchaseLines(args.lines);

  const { data: pedido, error } = await db(client)
    .from("compras_pedidos")
    .insert({
      tenant_id: args.tenantId,
      status: "rascunho",
      fornecedor_id: args.fornecedorId ?? null,
      empresa_id: args.empresaId ?? null,
      filial_id: args.filialId ?? null,
      data_necessidade: args.dataNecessidade ?? null,
      observacoes: args.observacoes ?? null,
      valor_total: valor,
      solicitante_id: args.userId,
      created_by: args.userId,
      updated_by: args.userId,
    })
    .select("id, status, valor_total")
    .single();

  if (error) {
    if (isMissingRelation(error.message)) {
      throw new Error(
        "Schema de compras ausente — aplicar migration 20260813.",
      );
    }
    throw new Error(error.message);
  }

  const items = args.lines.map((l) => ({
    tenant_id: args.tenantId,
    pedido_id: pedido.id,
    produto_id: l.produtoId,
    quantidade: l.quantidade,
    preco_unitario: l.precoUnitario,
  }));

  const { error: itemErr } = await db(client)
    .from("compras_pedido_itens")
    .insert(items);
  if (itemErr) {
    await db(client)
      .from("compras_pedidos")
      .update({ deleted_at: new Date().toISOString(), status: "cancelado" })
      .eq("id", pedido.id)
      .eq("tenant_id", args.tenantId);
    throw new Error(itemErr.message);
  }

  const { error: evErr } = await db(client).from("compras_eventos").insert({
    tenant_id: args.tenantId,
    pedido_id: pedido.id,
    from_status: null,
    to_status: "rascunho",
    nota: "Pedido criado",
    created_by: args.userId,
  });
  if (evErr) throw new Error(evErr.message);

  return pedido;
}

export async function transitionPurchaseOrder(
  client: Client,
  args: {
    tenantId: string;
    userId: string;
    pedidoId: string;
    toStatus: PurchaseWorkflowStatus;
    nota?: string | null;
  },
) {
  const to = assertPurchaseStatus(args.toStatus);

  const { data: current, error } = await db(client)
    .from("compras_pedidos")
    .select("id, tenant_id, status")
    .eq("id", args.pedidoId)
    .eq("tenant_id", args.tenantId)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (isMissingRelation(error.message)) {
      throw new Error(
        "Schema de compras ausente — aplicar migration 20260813.",
      );
    }
    throw new Error(error.message);
  }
  if (!current) throw new Error("Pedido não encontrado.");

  const from = assertPurchaseStatus(current.status);
  assertPurchaseTransition(from, to);

  // Integração real ANTES de carimbar — elimina falso sucesso
  let integrationNote: string | null = null;
  if (to === "integrado") {
    const { integratePurchaseOrderSideEffects } = await import(
      "./purchase-integration.ts"
    );
    const result = await integratePurchaseOrderSideEffects(client, {
      tenantId: args.tenantId,
      userId: args.userId,
      pedidoId: args.pedidoId,
    });
    integrationNote = `Estoque: ${result.stock.moved} mov / ${result.stock.skipped} skip. Finance: ${
      result.finance.created
        ? `AP ${result.finance.contaPagarId}`
        : result.finance.skippedReason ?? "sem AP"
    }`;
    if (result.stock.errors.length) {
      throw new Error(
        `Integração bloqueada — estoque com erro: ${result.stock.errors.join("; ")}`,
      );
    }
  }

  const patch: Record<string, unknown> = {
    status: to,
    updated_by: args.userId,
    updated_at: new Date().toISOString(),
  };
  if (to === "integrado") {
    patch.integrado_estoque_em = new Date().toISOString();
    patch.integrado_financeiro_em = new Date().toISOString();
  }

  const { error: updErr } = await db(client)
    .from("compras_pedidos")
    .update(patch as Database["public"]["Tables"]["compras_pedidos"]["Update"])
    .eq("id", args.pedidoId)
    .eq("tenant_id", args.tenantId);
  if (updErr) throw new Error(updErr.message);

  const { error: evErr } = await db(client).from("compras_eventos").insert({
    tenant_id: args.tenantId,
    pedido_id: args.pedidoId,
    from_status: from,
    to_status: to,
    nota: args.nota ?? integrationNote,
    created_by: args.userId,
  });
  if (evErr) throw new Error(evErr.message);

  return { id: args.pedidoId, from, to, integrationNote };
}

export async function summarizePurchasesMonth(
  client: Client,
  tenantId: string,
  monthStartIso: string,
) {
  const { data, error } = await db(client)
    .from("compras_pedidos")
    .select("id, status, valor_total, created_at")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .gte("created_at", monthStartIso)
    .limit(2000);

  if (error) {
    if (isMissingRelation(error.message)) {
      return {
        ready: false as const,
        pedidosMes: null,
        valorPedidosMes: null,
        pedidosAbertos: null,
      };
    }
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const abertos = rows.filter(
    (r) => r.status !== "integrado" && r.status !== "cancelado",
  );
  let valor = 0;
  let anyValor = false;
  for (const r of rows) {
    if (r.valor_total != null && Number.isFinite(Number(r.valor_total))) {
      valor += Number(r.valor_total);
      anyValor = true;
    }
  }

  return {
    ready: true as const,
    pedidosMes: rows.length,
    valorPedidosMes: anyValor ? valor : null,
    pedidosAbertos: abertos.length,
  };
}
