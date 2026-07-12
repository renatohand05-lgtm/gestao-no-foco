import type { VendaDetail } from "@/types/vendas";

export const FORMAS_PAGAMENTO_IMEDIATAS = [
  "dinheiro",
  "pix",
  "cartao_debito",
] as const;

export type FormaPagamentoImediata = (typeof FORMAS_PAGAMENTO_IMEDIATAS)[number];

export function isFormaPagamentoImediataTipo(
  tipo: string | null | undefined,
): tipo is FormaPagamentoImediata {
  return FORMAS_PAGAMENTO_IMEDIATAS.includes(tipo as FormaPagamentoImediata);
}

/** Critério de UI/serviço para exibir “Faturar e receber”. */
export function canFaturarEReceberVenda(venda: VendaDetail): boolean {
  if (venda.status !== "orcamento" && venda.status !== "em_andamento") {
    return false;
  }

  if ((venda.quantidade_parcelas ?? 1) !== 1) {
    return false;
  }

  if (!venda.cliente_id) {
    return false;
  }

  const forma = venda.forma_pagamento_ref;
  if (!forma) {
    return false;
  }

  if (!isFormaPagamentoImediataTipo(forma.tipo)) {
    return false;
  }

  if ((forma.dias_compensacao ?? 0) !== 0) {
    return false;
  }

  if (forma.gera_financeiro !== true) {
    return false;
  }

  return true;
}
