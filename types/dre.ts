import type { DreLinhaEconomica } from "@/lib/dre/dre-types";

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
  /** Opex consolidado (pessoal + operacional + comercial) — consumido pelo Dashboard. */
  despesas_operacionais: number;
  ebitda: number;
  resultado_final: number;
  receitas_financeiras: number;
  despesas_financeiras: number;
  despesas_pessoal?: number;
  despesas_comerciais?: number;
  despesas_operacionais_adm?: number;
  depreciacao_amortizacao?: number;
  ebit?: number;
  impostos_lucro?: number;
  resultado_antes_impostos?: number;
  /** 13.15.2 — leitura gerencial (não altera cálculos). */
  opex_grupo_principal?: string | null;
  opex_pct_receita_liquida?: number | null;
};

export type DreLinhaCodigo =
  | "receita_bruta"
  | "deducoes"
  | "receita_liquida"
  | "cmv"
  | "margem_contribuicao"
  | "despesas_pessoal"
  | "despesas_operacionais_adm"
  | "despesas_operacionais"
  | "despesas_comerciais"
  | "ebitda"
  | "depreciacao_amortizacao"
  | "ebit"
  | "receitas_financeiras"
  | "despesas_financeiras"
  | "resultado_antes_impostos"
  | "impostos_lucro"
  | "resultado_final";

export type DreLinha = {
  codigo: DreLinhaCodigo | string;
  label: string;
  valor: number;
  destaque?: boolean;
  drillable?: boolean;
  dreLinha?: DreLinhaEconomica;
  dreDetalhe?: string;
  depth?: number;
  expandable?: boolean;
  children?: DreLinha[];
  pctReceitaLiquida?: number | null;
};

export type DreGapOrigem = "venda" | "conta_receber" | "conta_pagar";

export type DreGapSugestao = {
  linha: string;
  detalhe: string | null;
  grupoLabel: string | null;
  detalheLabel: string | null;
  pathLabel: string;
  origem: "sugestao_nome";
};

export type DreGap = {
  origem: DreGapOrigem;
  id: string;
  corrigir_id: string;
  descricao: string;
  data_competencia: string;
  valor: number;
  campos_faltantes: string[];
  categoria_id?: string | null;
  plano_id?: string | null;
  sugestao?: DreGapSugestao | null;
};

export type DreFilterOptions = {
  centrosCusto: DreFilterOption[];
  categorias: DreFilterOption[];
  planosConta: DreFilterOption[];
};

export type DreDrillItem = {
  id: string;
  origem: string;
  origemId: string;
  corrigirId: string;
  descricao: string;
  competencia: string;
  valor: number;
  centroCustoId: string | null;
  categoriaId: string | null;
  planoContaId: string | null;
  fornecedorNome: string | null;
  status: string | null;
  linha: string;
  detalhe?: string | null;
  documento?: string | null;
  categoriaNome?: string | null;
  planoContaNome?: string | null;
  centroCustoNome?: string | null;
  dataVencimento?: string | null;
  dataPagamento?: string | null;
  rateioDescricao?: string | null;
  rateioPercentual?: number | null;
};

export type DreResult = {
  resumo: DreResumo;
  linhas: DreLinha[];
  gaps: DreGap[];
  filterOptions: DreFilterOptions;
  drillItems?: DreDrillItem[];
  opexHierarchy?: DreLinha[];
};
