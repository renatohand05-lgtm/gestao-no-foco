/**
 * Source of truth: tabela `formas_pagamento`.
 * Reutiliza o catálogo mínimo de Sprint 34.9 — sem quarto catálogo,
 * sem adquirente, taxas ou parcelamento inventados.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  missingContasPagarFormas,
  type FormaPagamentoExisting,
} from "@/lib/financeiro/formas-pagamento-catalog";
import { formatFormaPagamentoLabel } from "@/lib/financeiro/payment-method-label";
import type { Database } from "@/types/database";

export type FormaPagamentoAtiva = {
  id: string;
  nome: string;
  tipo: string | null;
  ativo: boolean;
};

export async function ensureFormasPagamentoCatalog(
  supabase: SupabaseClient<Database>,
  tenantId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("formas_pagamento")
    .select("id, nome, tipo")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const existing = (data ?? []) as FormaPagamentoExisting[];
  const missing = missingContasPagarFormas(existing);
  if (missing.length === 0) return;

  const payload = missing.map((item) => ({
    tenant_id: tenantId,
    nome: item.nome,
    tipo: item.tipo,
    ativo: true,
    gera_financeiro: true,
    dias_compensacao: 0,
  }));

  const { error: insertError } = await supabase
    .from("formas_pagamento")
    .insert(payload);

  if (insertError && insertError.code !== "23505") {
    throw new Error(insertError.message);
  }
}

export async function listActiveFormasPagamento(
  supabase: SupabaseClient<Database>,
  tenantId: string,
): Promise<FormaPagamentoAtiva[]> {
  try {
    await ensureFormasPagamentoCatalog(supabase, tenantId);
  } catch {
    // Sem permissão de escrita ou corrida: segue com o que já existe no tenant.
  }

  const { data, error } = await supabase
    .from("formas_pagamento")
    .select("id, nome, tipo, ativo")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as FormaPagamentoExisting[]).map((row) => ({
    id: row.id,
    nome: formatFormaPagamentoLabel({
      nome: row.nome,
      tipo: row.tipo,
    }),
    tipo: row.tipo ?? null,
    ativo: true,
  }));
}
