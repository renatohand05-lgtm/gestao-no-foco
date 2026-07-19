/**
 * Sprint 13.18 — tipos da camada de inteligência financeira (somente leitura).
 * Não redefine fórmulas do DRE/Fluxo: consome `DreResumo` / `FluxoCaixaResumo`.
 */

import type { DashboardChartPoint, DashboardKpiComparison } from "@/types/dashboard-executive";
import type { DreDrillItem, DreFilters, DreLinha, DreResumo } from "@/types/dre";
import type { FluxoCaixaResumo } from "@/types/fluxo-caixa";

export type FiTone = "positive" | "negative" | "neutral" | "warning";

export type FiMetricKey =
  | "receita_bruta"
  | "receita_liquida"
  | "cmv"
  | "lucro_bruto"
  | "despesas_operacionais"
  | "ebitda"
  | "ebit"
  | "resultado_liquido"
  | "margem_bruta"
  | "margem_ebitda"
  | "margem_liquida"
  | "break_even"
  | "ticket_medio"
  | "receita_por_cliente"
  | "receita_por_os"
  | "receita_por_mecanico"
  | "receita_por_consultor"
  | "receita_por_unidade";

export type FiMetricCard = {
  key: FiMetricKey;
  label: string;
  value: number;
  formatted: string;
  unit: "currency" | "percent" | "ratio";
  comparison: DashboardKpiComparison;
  previousFormatted: string;
  trendTone: FiTone;
  tooltip: string;
  href: string;
  available: boolean;
  unavailableReason?: string;
};

export type FiExpenseRow = {
  key: string;
  label: string;
  value: number;
  pctReceitaLiquida: number | null;
  href: string;
  source: "dre_resumo" | "dre_opex_grupo" | "dre_linha";
};

export type FiInsightSeverity = "info" | "warning" | "critical" | "positive";

export type FiInsight = {
  id: string;
  title: string;
  detail: string;
  severity: FiInsightSeverity;
  href?: string;
};

export type FiTrendSeries = {
  id: string;
  label: string;
  description: string;
  points: DashboardChartPoint[];
};

export type FiTrendPresets = {
  d7: { dataDe: string; dataAte: string; label: string };
  d30: { dataDe: string; dataAte: string; label: string };
  m12: { dataDe: string; dataAte: string; label: string };
  yoyCurrent: { dataDe: string; dataAte: string; label: string };
  yoyPrevious: { dataDe: string; dataAte: string; label: string };
};

export type FiRankItem = {
  id: string;
  label: string;
  value: number;
};

export type FinancialIntelligenceSnapshot = {
  filters: DreFilters;
  previousFilters: DreFilters;
  periodoLabel: string;
  previousPeriodoLabel: string;
  resumo: DreResumo;
  previousResumo: DreResumo;
  lucroBruto: number;
  fluxo: FluxoCaixaResumo;
  cockpit: FiMetricCard[];
  margins: FiMetricCard[];
  opsKpis: FiMetricCard[];
  expenses: FiExpenseRow[];
  opexHierarchy: DreLinha[];
  trends: FiTrendSeries[];
  insights: FiInsight[];
  topClientes: FiRankItem[];
  topCentros: FiRankItem[];
  drillPreview: DreDrillItem[];
};
