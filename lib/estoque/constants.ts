export const ESTOQUE_DEFAULT_PER_PAGE = 10;
export const ESTOQUE_MAX_PER_PAGE = 50;
export const ESTOQUE_PRODUTOS_RESUMO_PER_PAGE = 5;

export const MOVIMENTACAO_TIPO_OPTIONS = [
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída" },
  { value: "ajuste", label: "Ajuste manual" },
] as const;

export const MOVIMENTACAO_TIPO_FILTER_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  ...MOVIMENTACAO_TIPO_OPTIONS,
] as const;

export const MOVIMENTACAO_ORIGEM_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "compra", label: "Compra" },
  { value: "venda", label: "Venda" },
  { value: "ordem_servico", label: "Ordem de serviço" },
  { value: "devolucao", label: "Devolução" },
  { value: "inventario", label: "Inventário" },
  { value: "outro", label: "Outro" },
] as const;

export const MOVIMENTACAO_SORT_OPTIONS = [
  { value: "created_at", label: "Data" },
  { value: "tipo", label: "Tipo" },
  { value: "quantidade", label: "Quantidade" },
  { value: "quantidade_nova", label: "Saldo final" },
] as const;

export const ESTOQUE_SUCCESS_MESSAGES = {
  created: "Movimentação registrada com sucesso.",
  deleted: "Movimentação excluída com sucesso.",
} as const;

export const PRODUTO_TIPOS_SEM_ESTOQUE = ["servico"] as const;
