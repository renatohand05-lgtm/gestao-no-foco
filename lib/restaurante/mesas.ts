import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type MesaStatus = "livre" | "ocupada" | "reservada" | "limpeza";

export type Mesa = {
  id: string;
  tenantId: string;
  numero: string;
  capacidade: number | null;
  status: MesaStatus;
  ordemServicoId: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OpenComanda = {
  id: string;
  numero: number;
  status: string;
  valorTotal: number;
};

type RawMesaRow = {
  id: string;
  tenant_id: string;
  numero: string;
  capacidade: number | null;
  status: string;
  ordem_servico_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

function mapMesa(row: RawMesaRow): Mesa {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    numero: row.numero,
    capacidade: row.capacidade,
    status: row.status as MesaStatus,
    ordemServicoId: row.ordem_servico_id,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMesas(
  client: SupabaseClient,
  tenantId: string,
): Promise<Mesa[]> {
  const { data, error } = await client
    .from("restaurante_mesas" as never)
    .select("*")
    .eq("tenant_id", tenantId)
    .order("numero", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as RawMesaRow[]).map(mapMesa);
}

export async function createMesa(
  client: SupabaseClient,
  input: {
    tenantId: string;
    numero: string;
    capacidade: number | null;
    observacoes: string | null;
  },
): Promise<Mesa> {
  const { data, error } = await client
    .from("restaurante_mesas" as never)
    .insert({
      tenant_id: input.tenantId,
      numero: input.numero,
      capacidade: input.capacidade,
      observacoes: input.observacoes,
    } as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapMesa(data as unknown as RawMesaRow);
}

export async function updateMesaStatus(
  client: SupabaseClient,
  input: { tenantId: string; mesaId: string; status: MesaStatus },
): Promise<Mesa> {
  const { data, error } = await client
    .from("restaurante_mesas" as never)
    .update({ status: input.status } as never)
    .eq("id", input.mesaId)
    .eq("tenant_id", input.tenantId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapMesa(data as unknown as RawMesaRow);
}

export async function linkComandaToMesa(
  client: SupabaseClient,
  input: { tenantId: string; mesaId: string; ordemServicoId: string },
): Promise<Mesa> {
  const { data, error } = await client
    .from("restaurante_mesas" as never)
    .update({
      ordem_servico_id: input.ordemServicoId,
      status: "ocupada",
    } as never)
    .eq("id", input.mesaId)
    .eq("tenant_id", input.tenantId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapMesa(data as unknown as RawMesaRow);
}

export async function releaseMesa(
  client: SupabaseClient,
  input: { tenantId: string; mesaId: string },
): Promise<Mesa> {
  const { data, error } = await client
    .from("restaurante_mesas" as never)
    .update({ ordem_servico_id: null, status: "livre" } as never)
    .eq("id", input.mesaId)
    .eq("tenant_id", input.tenantId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapMesa(data as unknown as RawMesaRow);
}

export async function deleteMesa(
  client: SupabaseClient,
  input: { tenantId: string; mesaId: string },
): Promise<void> {
  const { error } = await client
    .from("restaurante_mesas" as never)
    .delete()
    .eq("id", input.mesaId)
    .eq("tenant_id", input.tenantId);
  if (error) throw new Error(error.message);
}

/** Comandas abertas (não entregues/faturadas/canceladas) do tenant — para vincular a uma mesa livre. */
export async function listOpenComandas(
  client: SupabaseClient,
  tenantId: string,
): Promise<OpenComanda[]> {
  const { data, error } = await client
    .from("ordens_servico")
    .select("id, numero, status, valor_total")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .not("status", "in", '("cancelado","entregue","faturado")')
    .order("numero", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    numero: row.numero,
    status: row.status,
    valorTotal: Number(row.valor_total ?? 0),
  }));
}
