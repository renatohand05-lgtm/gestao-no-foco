export type DreFilterOption = {
  id: string;
  nome: string;
};

export type DreFilters = {
  dataDe: string;
  dataAte: string;
  centroCustoId?: string;
  categoriaId?: string;
  planoContaId?: string;
};

export type DreResumo = {
  receita_bruta: number;
  deducoes: number;
  receita_liquida: number;
  cmv: number;
  margem_contribuicao: number;
  despesas_operacionais: number;
  ebitda: number;
  resultado_final: number;
  receitas_financeiras: number;
  despesas_financeiras: number;
};

export type DreLinhaCodigo =
  | "receita_bruta"
  | "deducoes"
  | "receita_liquida"
  | "cmv"
  | "margem_contribuicao"
  | "despesas_operacionais"
  | "ebitda"
  | "receitas_financeiras"
  | "despesas_financeiras"
  | "resultado_final";

export type DreLinha = {
  codigo: DreLinhaCodigo;
  label: string;
  valor: number;
  destaque?: boolean;
};

export type DreGapOrigem = "venda" | "conta_receber" | "conta_pagar";

export type DreGap = {
  origem: DreGapOrigem;
  id: string;
  /** ID do recurso editável (venda pai, título, etc.). */
  corrigir_id: string;
  descricao: string;
  data_competencia: string;
  valor: number;
  campos_faltantes: string[];
};

export type DreFilterOptions = {
  centrosCusto: DreFilterOption[];
  categorias: DreFilterOption[];
  planosConta: DreFilterOption[];
};

export type DreResult = {
  resumo: DreResumo;
  linhas: DreLinha[];
  gaps: DreGap[];
  filterOptions: DreFilterOptions;
};
