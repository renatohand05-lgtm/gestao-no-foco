import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { MovimentacaoBancariaOrigem } from "@/types/movimentacoes-bancarias";

export type TransferenciaAtomicaResult = {
  enviada_id: string;
  recebida_id: string;
  grupo_transferencia_id: string;
};

export async function registrarMovimentacaoBancariaAtomico(
  supabase: SupabaseClient<Database>,
  params: {
    tenantId: string;
    contaBancariaId: string;
    tipo: "entrada" | "saida" | "ajuste";
    valor: number;
    dataMovimentacao: string;
    descricao: string;
    origem?: MovimentacaoBancariaOrigem;
    contaPagarId?: string | null;
    contaReceberId?: string | null;
    observacoes?: string | null;
    createdBy?: string | null;
  },
): Promise<string> {
  const { data, error } = await supabase.rpc(
    "registrar_movimentacao_bancaria_atomico",
    {
      p_tenant_id: params.tenantId,
      p_conta_bancaria_id: params.contaBancariaId,
      p_tipo: params.tipo,
      p_valor: params.valor,
      p_data_movimentacao: params.dataMovimentacao,
      p_descricao: params.descricao,
      p_origem: params.origem ?? "manual",
      p_conta_pagar_id: params.contaPagarId ?? undefined,
      p_conta_receber_id: params.contaReceberId ?? undefined,
      p_observacoes: params.observacoes ?? undefined,
      p_created_by: params.createdBy ?? undefined,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao registrar movimentação bancária.");
  }

  return data;
}

export async function transferirEntreContasAtomico(
  supabase: SupabaseClient<Database>,
  params: {
    tenantId: string;
    contaOrigemId: string;
    contaDestinoId: string;
    valor: number;
    dataMovimentacao: string;
    descricao: string;
    observacoes?: string | null;
    createdBy?: string | null;
  },
): Promise<TransferenciaAtomicaResult> {
  const { data, error } = await supabase.rpc("transferir_entre_contas_atomico", {
    p_tenant_id: params.tenantId,
    p_conta_origem_id: params.contaOrigemId,
    p_conta_destino_id: params.contaDestinoId,
    p_valor: params.valor,
    p_data_movimentacao: params.dataMovimentacao,
    p_descricao: params.descricao,
    p_observacoes: params.observacoes ?? undefined,
    p_created_by: params.createdBy ?? undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Erro ao registrar transferência bancária.");
  }

  const result = data as Record<string, unknown>;

  if (
    typeof result.enviada_id !== "string" ||
    typeof result.recebida_id !== "string"
  ) {
    throw new Error("Resposta inválida ao registrar transferência bancária.");
  }

  return {
    enviada_id: result.enviada_id,
    recebida_id: result.recebida_id,
    grupo_transferencia_id:
      typeof result.grupo_transferencia_id === "string"
        ? result.grupo_transferencia_id
        : "",
  };
}

export async function estornarMovimentacaoBancariaAtomico(
  supabase: SupabaseClient<Database>,
  params: {
    tenantId: string;
    movimentacaoId: string;
    dataMovimentacao: string;
    observacoes?: string | null;
    createdBy?: string | null;
  },
): Promise<string> {
  const { data, error } = await supabase.rpc(
    "estornar_movimentacao_bancaria_atomico",
    {
      p_tenant_id: params.tenantId,
      p_movimentacao_id: params.movimentacaoId,
      p_data_movimentacao: params.dataMovimentacao,
      p_observacoes: params.observacoes ?? undefined,
      p_created_by: params.createdBy ?? undefined,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao estornar movimentação bancária.");
  }

  return data;
}

export async function baixarContaPagarAtomico(
  supabase: SupabaseClient<Database>,
  params: {
    tenantId: string;
    contaPagarId: string;
    dataPagamento: string;
    contaBancariaId?: string | null;
    valorPagamento?: number;
    desconto?: number;
    juros?: number;
    multa?: number;
    formaPagamentoId?: string | null;
    createdBy?: string | null;
  },
): Promise<string> {
  const { data, error } = await supabase.rpc("baixar_conta_pagar_atomico", {
    p_tenant_id: params.tenantId,
    p_conta_pagar_id: params.contaPagarId,
    p_data_pagamento: params.dataPagamento,
    p_conta_bancaria_id: params.contaBancariaId ?? undefined,
    p_valor_pagamento: params.valorPagamento ?? undefined,
    p_desconto: params.desconto ?? undefined,
    p_juros: params.juros ?? undefined,
    p_multa: params.multa ?? undefined,
    p_forma_pagamento_id: params.formaPagamentoId ?? undefined,
    p_created_by: params.createdBy ?? undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao registrar baixa de pagamento.");
  }

  return data;
}

export async function baixarContaReceberAtomico(
  supabase: SupabaseClient<Database>,
  params: {
    tenantId: string;
    contaReceberId: string;
    dataRecebimento: string;
    contaBancariaId: string;
    valorRecebido: number;
    desconto?: number;
    juros?: number;
    multa?: number;
    createdBy?: string | null;
  },
): Promise<string> {
  const { data, error } = await supabase.rpc("baixar_conta_receber_atomico", {
    p_tenant_id: params.tenantId,
    p_conta_receber_id: params.contaReceberId,
    p_data_recebimento: params.dataRecebimento,
    p_conta_bancaria_id: params.contaBancariaId,
    p_valor_recebido: params.valorRecebido,
    p_desconto: params.desconto ?? undefined,
    p_juros: params.juros ?? undefined,
    p_multa: params.multa ?? undefined,
    p_created_by: params.createdBy ?? undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Erro ao registrar baixa de recebimento.");
  }

  return data;
}
