import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CrmSequenceStepInput = {
  ordem: number;
  delayDias: number;
  canal: "whatsapp" | "email";
  mensagem: string;
};

export type CrmSequence = {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: string;
  steps: Array<{
    id: string;
    ordem: number;
    delayDias: number;
    canal: "whatsapp" | "email";
    mensagem: string;
  }>;
  inscritosAtivos: number;
};

export async function createSequence(
  supabase: SupabaseClient,
  tenantId: string,
  nome: string,
  steps: CrmSequenceStepInput[],
  userId: string | null,
): Promise<string> {
  if (steps.length === 0) {
    throw new Error("A sequência precisa de pelo menos uma etapa.");
  }

  const { data: seq, error: seqError } = await supabase
    .from("crm_sequences" as never)
    .insert({ tenant_id: tenantId, nome, created_by: userId } as never)
    .select("id")
    .single<{ id: string }>();

  if (seqError || !seq) {
    throw new Error(seqError?.message ?? "Falha ao criar a sequência.");
  }

  const stepsPayload = steps.map((s) => ({
    sequence_id: seq.id,
    tenant_id: tenantId,
    ordem: s.ordem,
    delay_dias: s.delayDias,
    canal: s.canal,
    mensagem: s.mensagem,
  }));

  const { error: stepsError } = await supabase
    .from("crm_sequence_steps" as never)
    .insert(stepsPayload as never);

  if (stepsError) {
    await supabase.from("crm_sequences" as never).delete().eq("id", seq.id);
    throw new Error(stepsError.message);
  }

  return seq.id;
}

export async function listSequences(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<CrmSequence[]> {
  const { data: sequences, error } = await supabase
    .from("crm_sequences" as never)
    .select("id, nome, ativo, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (sequences ?? []) as unknown as Array<{
    id: string;
    nome: string;
    ativo: boolean;
    created_at: string;
  }>;
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const { data: steps } = await supabase
    .from("crm_sequence_steps" as never)
    .select("id, sequence_id, ordem, delay_dias, canal, mensagem")
    .in("sequence_id", ids)
    .order("ordem", { ascending: true });

  const { data: enrollments } = await supabase
    .from("crm_sequence_enrollments" as never)
    .select("sequence_id")
    .in("sequence_id", ids)
    .eq("status", "ativo");

  const stepsRows = (steps ?? []) as unknown as Array<{
    id: string;
    sequence_id: string;
    ordem: number;
    delay_dias: number;
    canal: "whatsapp" | "email";
    mensagem: string;
  }>;
  const enrollmentRows = (enrollments ?? []) as unknown as Array<{
    sequence_id: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    ativo: r.ativo,
    createdAt: r.created_at,
    steps: stepsRows
      .filter((s) => s.sequence_id === r.id)
      .map((s) => ({
        id: s.id,
        ordem: s.ordem,
        delayDias: s.delay_dias,
        canal: s.canal,
        mensagem: s.mensagem,
      })),
    inscritosAtivos: enrollmentRows.filter((e) => e.sequence_id === r.id).length,
  }));
}

export async function toggleSequenceActive(
  supabase: SupabaseClient,
  tenantId: string,
  sequenceId: string,
  ativo: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("crm_sequences" as never)
    .update({ ativo, updated_at: new Date().toISOString() } as never)
    .eq("id", sequenceId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/** Inscreve um ou mais clientes na sequência — primeira etapa é agendada com base no delay_dias dela. */
export async function enrollClientes(
  supabase: SupabaseClient,
  tenantId: string,
  sequenceId: string,
  clienteIds: string[],
  userId: string | null,
): Promise<{ inscritos: number; jaInscritos: number }> {
  const { data: firstStep, error: stepError } = await supabase
    .from("crm_sequence_steps" as never)
    .select("ordem, delay_dias")
    .eq("sequence_id", sequenceId)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle<{ ordem: number; delay_dias: number }>();

  if (stepError || !firstStep) {
    throw new Error("Sequência sem etapas configuradas.");
  }

  const nextDispatchAt = new Date(
    Date.now() + firstStep.delay_dias * 24 * 60 * 60 * 1000,
  ).toISOString();

  const payload = clienteIds.map((clienteId) => ({
    tenant_id: tenantId,
    sequence_id: sequenceId,
    cliente_id: clienteId,
    current_step_ordem: firstStep.ordem,
    next_dispatch_at: nextDispatchAt,
    enrolled_by: userId,
  }));

  const { data, error } = await supabase
    .from("crm_sequence_enrollments" as never)
    .upsert(payload as never, {
      onConflict: "sequence_id,cliente_id",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) throw new Error(error.message);

  const inscritos = (data ?? []).length;
  return { inscritos, jaInscritos: clienteIds.length - inscritos };
}

export async function cancelEnrollment(
  supabase: SupabaseClient,
  tenantId: string,
  enrollmentId: string,
): Promise<void> {
  const { error } = await supabase
    .from("crm_sequence_enrollments" as never)
    .update({ status: "cancelado" } as never)
    .eq("id", enrollmentId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

export type ClienteSearchResult = { id: string; nome: string };

export async function searchClientesForEnrollment(
  supabase: SupabaseClient,
  tenantId: string,
  query: string,
): Promise<ClienteSearchResult[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .ilike("nome", `%${query.trim()}%`)
    .limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []) as ClienteSearchResult[];
}
