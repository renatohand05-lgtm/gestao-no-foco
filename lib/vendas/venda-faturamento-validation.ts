import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveLegacyFormaPagamentoId } from "@/lib/vendas/mappers";
import type { Database } from "@/types/database";
import type { FormaPagamentoOption, VendaDetail } from "@/types/vendas";

export const VENDA_FATURAMENTO_FORMA_FINANCEIRA_MSG =
  "Informe uma forma de pagamento antes de faturar uma venda que gera financeiro.";

type FormaFaturamento = {
  id: string;
  gera_financeiro: boolean;
  ativo: boolean;
};

function vendaIndicaExpectativaFinanceira(venda: VendaDetail): boolean {
  return (
    (venda.quantidade_parcelas ?? 1) > 1 ||
    Boolean(venda.categoria_financeira_id) ||
    Boolean(venda.centro_custo_id)
  );
}

async function loadFormaFaturamento(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  formaPagamentoId: string,
): Promise<FormaFaturamento | null> {
  const { data, error } = await supabase
    .from("formas_pagamento")
    .select("id, gera_financeiro, ativo")
    .eq("tenant_id", tenantId)
    .eq("id", formaPagamentoId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function listFormasPagamentoAtivas(
  supabase: SupabaseClient<Database>,
  tenantId: string,
): Promise<FormaPagamentoOption[]> {
  const { data, error } = await supabase
    .from("formas_pagamento")
    .select("id, nome, tipo, ativo")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as FormaPagamentoOption[];
}

async function resolveFormaParaFaturamento(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  venda: VendaDetail,
): Promise<FormaFaturamento | null> {
  if (venda.forma_pagamento_id) {
    return loadFormaFaturamento(supabase, tenantId, venda.forma_pagamento_id);
  }

  const formas = await listFormasPagamentoAtivas(supabase, tenantId);
  const legacyId = resolveLegacyFormaPagamentoId(venda.forma_pagamento, formas);

  if (!legacyId) {
    return null;
  }

  return loadFormaFaturamento(supabase, tenantId, legacyId);
}

export async function validateFormaPagamentoParaFaturamento(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  venda: VendaDetail,
): Promise<void> {
  const forma = await resolveFormaParaFaturamento(supabase, tenantId, venda);
  const requerFinanceiro =
    forma?.gera_financeiro === true || vendaIndicaExpectativaFinanceira(venda);

  if (requerFinanceiro && !venda.forma_pagamento_id) {
    throw new Error(VENDA_FATURAMENTO_FORMA_FINANCEIRA_MSG);
  }

  if (!venda.forma_pagamento_id) {
    return;
  }

  if (!forma) {
    throw new Error(
      "Forma de pagamento não encontrada ou inativa. Selecione outra forma na venda.",
    );
  }

  if (!forma.ativo) {
    throw new Error("A forma de pagamento selecionada está inativa.");
  }

  if (forma.gera_financeiro && !venda.cliente_id) {
    throw new Error(
      "Para gerar contas a receber, a venda precisa de um cliente vinculado.",
    );
  }
}
