import type { TenantSegment } from "@/types";
import type { ContasPagarResumo } from "@/types/contas-pagar";
import type { ContasReceberResumo } from "@/types/contas-receber";
import type { FluxoCaixaResumo, FluxoCaixaStatusFilter } from "@/types/fluxo-caixa";
import type { DashboardIntelligenceResult } from "@/types/intelligence";
import type { QualidadeOperacionalData } from "@/types/qualidade-operacional";

export type DashboardFilterOption = {
  id: string;
  nome: string;
};

export type DashboardFilterOptions = {
  centrosCusto: DashboardFilterOption[];
  categorias: DashboardFilterOption[];
  contasBancarias: DashboardFilterOption[];
};

export type DashboardFilters = {
  dataDe: string;
  dataAte: string;
  centroCusto?: string;
  categoria?: string;
  contaBancaria?: string;
  status?: FluxoCaixaStatusFilter;
};

export type DashboardKpis = {
  faturamento: number;
  receita_liquida: number;
  ebitda: number;
  cmv: number;
  saldo_bancario: number;
  contas_receber_aberto: number;
  contas_pagar_aberto: number;
  entradas_previstas: number;
  saidas_previstas: number;
  ticket_medio: number;
  quantidade_clientes: number;
  quantidade_vendas: number;
  /** Percentual: margem de contribuição / receita líquida (DRE). */
  margem_media: number;
};

export type DashboardTrend = "up" | "down" | "neutral";

export type DashboardKpiComparison = {
  current: number;
  previous: number;
  /** null when previous is 0 and current ≠ 0 (evita Infinity). */
  variationPct: number | null;
  trend: DashboardTrend;
};

export type DashboardComparableKpiKey =
  | "faturamento"
  | "receita_liquida"
  | "ebitda"
  | "contas_receber_aberto"
  | "contas_pagar_aberto"
  | "ticket_medio"
  | "margem_media"
  | "cmv"
  | "quantidade_vendas";

export type DashboardComparisons = Record<
  DashboardComparableKpiKey,
  DashboardKpiComparison
>;

export type DashboardPeriodo = {
  dataDe: string;
  dataAte: string;
  label: string;
};

export type DashboardChartPoint = {
  label: string;
  data: string;
  value: number;
  secondary?: number;
};

export type DashboardCharts = {
  faturamentoDiario: DashboardChartPoint[];
  receitasVsDespesas: DashboardChartPoint[];
  fluxoAcumulado: DashboardChartPoint[];
  ebitdaEvolucao: DashboardChartPoint[];
};

export type DashboardRankingItem = {
  id: string;
  label: string;
  value: number;
};

export type DashboardRankings = {
  clientes: DashboardRankingItem[];
  produtos: DashboardRankingItem[];
  servicos: DashboardRankingItem[];
  categorias: DashboardRankingItem[];
};

export type DashboardExecutiveData = {
  kpis: DashboardKpis;
  comparisons: DashboardComparisons;
  charts: DashboardCharts;
  rankings: DashboardRankings;
  intelligence: DashboardIntelligenceResult;
  qualidadeOperacional: QualidadeOperacionalData;
  periodo: DashboardPeriodo;
  periodoAnterior: DashboardPeriodo;
  filters: DashboardFilters;
  segment: TenantSegment | null;
  hasData: boolean;
};

/** Bloco prioritário (KPIs + período) — sem charts pesados / rankings / intelligence. */
export type DashboardPrimaryData = {
  kpis: DashboardKpis;
  comparisons: DashboardComparisons;
  /** Séries baratas derivadas do Fluxo (receitas×despesas, acumulado). */
  fluxoCharts: Pick<DashboardCharts, "receitasVsDespesas" | "fluxoAcumulado">;
  fluxoResumo: FluxoCaixaResumo;
  contasReceber: ContasReceberResumo;
  contasPagar: ContasPagarResumo;
  periodo: DashboardPeriodo;
  periodoAnterior: DashboardPeriodo;
  filters: DashboardFilters;
  segment: TenantSegment | null;
  hasData: boolean;
};
