/**
 * DRE Enterprise — tipos de composição (Sprint 13.15).
 * Sem I/O. Sem movimentação bancária como origem de despesa.
 */

export type DreLinhaEconomica =
  | "receita_bruta"
  | "deducoes"
  | "cmv"
  | "despesas_pessoal"
  | "despesas_operacionais"
  | "despesas_comerciais"
  | "depreciacao_amortizacao"
  | "receitas_financeiras"
  | "despesas_financeiras"
  | "impostos_lucro";

export type DreOrigemEconomica =
  | "venda"
  | "conta_receber"
  | "conta_pagar"
  | "conta_pagar_rateio";

export type DreLedgerEntry = {
  id: string;
  origem: DreOrigemEconomica;
  origemId: string;
  /** ID editável (título pai / venda). */
  corrigirId: string;
  descricao: string;
  competencia: string;
  linha: DreLinhaEconomica;
  /** Valor já com sinal: despesa positiva reduz resultado nas linhas (-). */
  valor: number;
  centroCustoId: string | null;
  categoriaId: string | null;
  planoContaId: string | null;
  fornecedorNome: string | null;
  status: string | null;
  documento: string | null;
  categoriaNome?: string | null;
  planoContaNome?: string | null;
  centroCustoNome?: string | null;
  dataVencimento?: string | null;
  dataPagamento?: string | null;
  rateioDescricao?: string | null;
  rateioPercentual?: number | null;
  /** Detalhe gerencial (hierarquia opex) — não altera totais. */
  detalhe?: string | null;
};

export type DreTotals = {
  receita_bruta: number;
  deducoes: number;
  receita_liquida: number;
  cmv: number;
  margem_contribuicao: number;
  despesas_pessoal: number;
  despesas_operacionais: number;
  despesas_comerciais: number;
  /** Soma pessoal + operacional + comercial (compat Dashboard). */
  despesas_opex_total: number;
  ebitda: number;
  depreciacao_amortizacao: number;
  ebit: number;
  receitas_financeiras: number;
  despesas_financeiras: number;
  resultado_antes_impostos: number;
  impostos_lucro: number;
  resultado_final: number;
};

export const DRE_LINHA_LABELS: Record<DreLinhaEconomica, string> = {
  receita_bruta: "Receita bruta",
  deducoes: "Deduções da receita",
  cmv: "CMV / custos variáveis",
  despesas_pessoal: "Despesas com pessoal",
  despesas_operacionais: "Despesas operacionais",
  despesas_comerciais: "Despesas comerciais",
  depreciacao_amortizacao: "Depreciação e amortização",
  receitas_financeiras: "Receitas financeiras",
  despesas_financeiras: "Despesas financeiras",
  impostos_lucro: "Impostos sobre o lucro",
};

export const DRE_LINHA_OPTIONS: Array<{
  value: DreLinhaEconomica;
  label: string;
}> = (Object.keys(DRE_LINHA_LABELS) as DreLinhaEconomica[]).map((value) => ({
  value,
  label: DRE_LINHA_LABELS[value],
}));
