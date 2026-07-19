import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type FinanceiroLancamentoEventAction =
  | "criacao"
  | "edicao"
  | "cancelamento"
  | "soft_delete"
  | "restauracao"
  | "pagamento"
  | "recebimento"
  | "estorno"
  | "alteracao_valor"
  | "alteracao_competencia"
  | "alteracao_categoria"
  | "alteracao_centro"
  | "alteracao_rateio"
  | "duplicacao";

export type FinanceiroLancamentoEvent = {
  id: string;
  tenant_id: string;
  entity_type: "conta_pagar" | "conta_receber";
  entity_id: string;
  action: FinanceiroLancamentoEventAction;
  motivo: string | null;
  payload_antes: unknown;
  payload_depois: unknown;
  user_id: string | null;
  created_at: string;
};

/**
 * Auditoria best-effort: se a tabela ainda não foi migrada, não falha a operação.
 */
export async function recordFinanceiroLancamentoEvent(
  supabase: SupabaseClient<Database>,
  input: {
    tenantId: string;
    entityType: "conta_pagar" | "conta_receber";
    entityId: string;
    action: FinanceiroLancamentoEventAction;
    motivo?: string | null;
    payloadAntes?: unknown;
    payloadDepois?: unknown;
    userId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("financeiro_lancamento_eventos" as never)
    .insert({
      tenant_id: input.tenantId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      motivo: input.motivo ?? null,
      payload_antes: input.payloadAntes ?? null,
      payload_depois: input.payloadDepois ?? null,
      user_id: input.userId ?? null,
    } as never);

  if (error && !error.message.toLowerCase().includes("financeiro_lancamento")) {
    // Não interrompe o fluxo financeiro por falha de auditoria.
    console.error("Falha ao registrar evento financeiro:", error.message);
  }
}

export async function listFinanceiroLancamentoEvents(
  supabase: SupabaseClient<Database>,
  input: {
    tenantId: string;
    entityType: "conta_pagar" | "conta_receber";
    entityId: string;
    limit?: number;
  },
): Promise<FinanceiroLancamentoEvent[]> {
  const { data, error } = await supabase
    .from("financeiro_lancamento_eventos" as never)
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 50);

  if (error) {
    if (error.message.toLowerCase().includes("financeiro_lancamento")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as FinanceiroLancamentoEvent[];
}
