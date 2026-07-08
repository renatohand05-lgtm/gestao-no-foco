export const PRODUTOS_DEFAULT_PER_PAGE = 10;
export const PRODUTOS_MAX_PER_PAGE = 50;

export const PRODUTO_TIPO_OPTIONS = [
  { value: "produto", label: "Produto" },
  { value: "servico", label: "Serviço" },
  { value: "kit", label: "Kit" },
  { value: "combo", label: "Combo" },
  { value: "materia_prima", label: "Matéria-prima" },
] as const;

export const PRODUTO_STATUS_OPTIONS = [
  { value: true, label: "Ativo" },
  { value: false, label: "Inativo" },
] as const;

export const PRODUTO_SORT_OPTIONS = [
  { value: "nome", label: "Nome" },
  { value: "created_at", label: "Cadastro" },
  { value: "preco_venda", label: "Preço" },
  { value: "estoque_atual", label: "Estoque" },
  { value: "tipo", label: "Tipo" },
  { value: "ativo", label: "Status" },
] as const;

export const UNIDADE_MEDIDA_OPTIONS = [
  { value: "UN", label: "Unidade (UN)" },
  { value: "KG", label: "Quilograma (KG)" },
  { value: "G", label: "Grama (G)" },
  { value: "L", label: "Litro (L)" },
  { value: "ML", label: "Mililitro (ML)" },
  { value: "M", label: "Metro (M)" },
  { value: "M2", label: "Metro quadrado (M²)" },
  { value: "M3", label: "Metro cúbico (M³)" },
  { value: "CX", label: "Caixa (CX)" },
  { value: "PCT", label: "Pacote (PCT)" },
  { value: "HR", label: "Hora (HR)" },
] as const;

export const PRODUTO_TIPO_FILTER_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  ...PRODUTO_TIPO_OPTIONS,
] as const;

export const PRODUTO_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "true", label: "Ativos" },
  { value: "false", label: "Inativos" },
] as const;

export const PRODUTO_SUCCESS_MESSAGES = {
  created: "Item cadastrado com sucesso.",
  updated: "Item atualizado com sucesso.",
  deleted: "Item excluído com sucesso.",
} as const;

export const PRODUTO_TIPOS_COM_ESTOQUE = [
  "produto",
  "kit",
  "combo",
  "materia_prima",
] as const;
