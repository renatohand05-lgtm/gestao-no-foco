export const VENDAS_DEFAULT_PER_PAGE = 10;
export const VENDAS_MAX_PER_PAGE = 50;

export const VENDA_STATUS_OPTIONS = [
  { value: "orcamento", label: "Orçamento" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "faturado", label: "Faturado" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const VENDA_STATUS_EDITAVEIS = ["orcamento", "em_andamento"] as const;

export const VENDA_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos os status" },
  ...VENDA_STATUS_OPTIONS,
] as const;

export const VENDA_FORMA_PAGAMENTO_OPTIONS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
] as const;

/** Rótulos legados para vendas criadas antes da integração com formas_pagamento */
export const LEGACY_FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  boleto: "Boleto",
  transferencia: "Transferência",
  outro: "Outro",
  outros: "Outros",
};

/** Mapeia slug legado de venda para tipo em formas_pagamento */
export const LEGACY_FORMA_PAGAMENTO_TIPO_MAP: Record<string, string> = {
  outro: "outros",
};

export const VENDA_SORT_OPTIONS = [
  { value: "numero", label: "Número" },
  { value: "data_venda", label: "Data" },
  { value: "total", label: "Total" },
  { value: "status", label: "Status" },
  { value: "created_at", label: "Cadastro" },
] as const;

export const VENDA_SUCCESS_MESSAGES = {
  created: "Venda registrada com sucesso.",
  updated: "Venda atualizada com sucesso.",
  deleted: "Venda excluída com sucesso.",
  faturado: "Venda faturada com sucesso. Estoque atualizado.",
  faturado_recebido:
    "Venda faturada e recebida com sucesso. Estoque e caixa atualizados.",
  cancelado: "Venda cancelada com sucesso.",
} as const;
