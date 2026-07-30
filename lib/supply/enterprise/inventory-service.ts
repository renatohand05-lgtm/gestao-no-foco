/**
 * Fase 25 — Inventário (Supabase + modelo puro).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import {
  assertInventoryTransition,
  computeInventoryDivergences,
  type InventoryCycleKind,
  type InventoryCycleStatus,
} from "./inventory-model.ts";
import { supplyClient } from "./supabase-table.ts";

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

export async function probeInventorySchema(client: Client, tenantId: string) {
  const { error } = await db(client)
    .from("estoque_inventarios")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1);
  if (error && isMissingRelation(error.message)) {
    return { ready: false as const, message: error.message };
  }
  if (error) throw new Error(error.message);
  return { ready: true as const, message: "ok" };
}

export async function listInventoryCycles(client: Client, tenantId: string) {
  const { data, error } = await db(client)
    .from("estoque_inventarios")
    .select(
      "id, tenant_id, kind, status, deposito_id, created_at, empresa_id, filial_id",
    )
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingRelation(error.message)) {
      return {
        rows: [] as Array<{
          id: string;
          tenant_id: string;
          kind: string;
          status: string;
          deposito_id: string | null;
          created_at: string;
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

export async function createInventoryCycle(
  client: Client,
  args: {
    tenantId: string;
    userId: string;
    kind: InventoryCycleKind;
    depositoId?: string | null;
    empresaId?: string | null;
    filialId?: string | null;
  },
) {
  const { data, error } = await db(client)
    .from("estoque_inventarios")
    .insert({
      tenant_id: args.tenantId,
      kind: args.kind,
      status: "aberto",
      deposito_id: args.depositoId ?? null,
      empresa_id: args.empresaId ?? null,
      filial_id: args.filialId ?? null,
      created_by: args.userId,
    })
    .select("id, kind, status")
    .single();

  if (error) {
    if (isMissingRelation(error.message)) {
      throw new Error(
        "Schema de inventário ausente — aplicar migration 20260813.",
      );
    }
    throw new Error(error.message);
  }
  return data;
}

export async function transitionInventoryCycle(
  client: Client,
  args: {
    tenantId: string;
    inventarioId: string;
    toStatus: InventoryCycleStatus;
  },
) {
  const { data: current, error } = await db(client)
    .from("estoque_inventarios")
    .select("id, status")
    .eq("id", args.inventarioId)
    .eq("tenant_id", args.tenantId)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (isMissingRelation(error.message)) {
      throw new Error(
        "Schema de inventário ausente — aplicar migration 20260813.",
      );
    }
    throw new Error(error.message);
  }
  if (!current) throw new Error("Inventário não encontrado.");

  const from = current.status as InventoryCycleStatus;
  assertInventoryTransition(from, args.toStatus);

  const patch: Record<string, unknown> = {
    status: args.toStatus,
    updated_at: new Date().toISOString(),
  };
  if (args.toStatus === "fechado") {
    patch.closed_at = new Date().toISOString();
  }

  const { error: updErr } = await db(client)
    .from("estoque_inventarios")
    .update(patch as Database["public"]["Tables"]["estoque_inventarios"]["Update"])
    .eq("id", args.inventarioId)
    .eq("tenant_id", args.tenantId);
  if (updErr) throw new Error(updErr.message);

  return { id: args.inventarioId, from, to: args.toStatus };
}

export async function summarizeOpenInventoryDivergences(
  client: Client,
  tenantId: string,
) {
  const { data: cycles, error } = await db(client)
    .from("estoque_inventarios")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .in("status", ["aberto", "em_conferencia", "divergencias", "ajustado"])
    .limit(50);

  if (error) {
    if (isMissingRelation(error.message)) {
      return {
        ready: false as const,
        ciclosAbertos: null,
        divergencias: null,
      };
    }
    throw new Error(error.message);
  }

  const ids = (cycles ?? []).map((c) => c.id);
  if (ids.length === 0) {
    return {
      ready: true as const,
      ciclosAbertos: 0,
      divergencias: 0,
    };
  }

  const { data: items, error: itemErr } = await db(client)
    .from("estoque_inventario_itens")
    .select("id, contagem, saldo_sistema, divergencia")
    .eq("tenant_id", tenantId)
    .in("inventario_id", ids)
    .limit(5000);

  if (itemErr) throw new Error(itemErr.message);

  const lines = (items ?? []).map((i) => ({
    produtoId: i.id,
    saldoSistema: Number(i.saldo_sistema),
    contagem: i.contagem == null ? null : Number(i.contagem),
  }));
  const divs = computeInventoryDivergences(lines);

  return {
    ready: true as const,
    ciclosAbertos: ids.length,
    divergencias: divs.length,
  };
}
