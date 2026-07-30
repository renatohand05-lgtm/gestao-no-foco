/**
 * Fase 25 — Serviços de depósito/almoxarifado (Supabase).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { supplyClient } from "./supabase-table.ts";
import { assertDepositoDraft, assertAlmoxarifadoDraft } from "./warehouse-model.ts";

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

export async function listDepositos(client: Client, tenantId: string) {
  const { data, error } = await db(client)
    .from("estoque_depositos")
    .select(
      "id, tenant_id, empresa_id, filial_id, codigo, nome, ativo, created_at",
    )
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("nome")
    .limit(500);

  if (error) {
    if (isMissingRelation(error.message)) {
      return {
        rows: [] as Array<{
          id: string;
          tenant_id: string;
          empresa_id: string | null;
          filial_id: string | null;
          codigo: string;
          nome: string;
          ativo: boolean;
          created_at: string;
        }>,
        ready: false as const,
        error: error.message,
      };
    }
    throw new Error(error.message);
  }
  return { rows: data ?? [], ready: true as const, error: null };
}

export async function createDeposito(
  client: Client,
  args: {
    tenantId: string;
    userId: string;
    nome: string;
    codigo: string;
    empresaId?: string | null;
    filialId?: string | null;
  },
) {
  const errs = assertDepositoDraft({
    nome: args.nome,
    codigo: args.codigo,
    empresaId: args.empresaId ?? null,
    filialId: args.filialId ?? null,
    ativo: true,
  });
  if (errs.length) throw new Error(errs.join(" "));

  const { data, error } = await db(client)
    .from("estoque_depositos")
    .insert({
      tenant_id: args.tenantId,
      nome: args.nome.trim(),
      codigo: args.codigo.trim().toUpperCase(),
      empresa_id: args.empresaId ?? null,
      filial_id: args.filialId ?? null,
      created_by: args.userId,
      updated_by: args.userId,
    })
    .select("id, codigo, nome")
    .single();

  if (error) {
    if (isMissingRelation(error.message)) {
      throw new Error(
        "Schema de depósitos ausente — aplicar migration 20260813.",
      );
    }
    throw new Error(error.message);
  }
  return data;
}

export async function createAlmoxarifado(
  client: Client,
  args: {
    tenantId: string;
    depositoId: string;
    nome: string;
    codigo: string;
  },
) {
  const errs = assertAlmoxarifadoDraft({
    depositoId: args.depositoId,
    nome: args.nome,
    codigo: args.codigo,
    ativo: true,
  });
  if (errs.length) throw new Error(errs.join(" "));

  const { data, error } = await db(client)
    .from("estoque_almoxarifados")
    .insert({
      tenant_id: args.tenantId,
      deposito_id: args.depositoId,
      nome: args.nome.trim(),
      codigo: args.codigo.trim().toUpperCase(),
    })
    .select("id, codigo, nome, deposito_id")
    .single();

  if (error) {
    if (isMissingRelation(error.message)) {
      throw new Error(
        "Schema de almoxarifados ausente — aplicar migration 20260813.",
      );
    }
    throw new Error(error.message);
  }
  return data;
}

export async function listAlmoxarifados(
  client: Client,
  tenantId: string,
  depositoId?: string,
) {
  let q = db(client)
    .from("estoque_almoxarifados")
    .select("id, tenant_id, deposito_id, codigo, nome, ativo")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("nome")
    .limit(500);

  if (depositoId) q = q.eq("deposito_id", depositoId);

  const { data, error } = await q;
  if (error) {
    if (isMissingRelation(error.message)) {
      return {
        rows: [] as Array<{
          id: string;
          tenant_id: string;
          deposito_id: string;
          codigo: string;
          nome: string;
          ativo: boolean;
        }>,
        ready: false as const,
      };
    }
    throw new Error(error.message);
  }
  return { rows: data ?? [], ready: true as const };
}
