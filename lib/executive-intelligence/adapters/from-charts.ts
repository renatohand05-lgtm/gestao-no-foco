/**
 * Adapta charts do dashboard / séries livres → MetricSeriesPoint (Sprint 29.4).
 */

import type { DashboardChartPoint } from "../../../types/dashboard-executive.ts";
import type { InsightDomain, MetricSeriesPoint } from "../types.ts";

export function chartPointsToSeries(
  points: DashboardChartPoint[] | null | undefined,
): MetricSeriesPoint[] {
  if (!points?.length) return [];
  return points.map((p) => ({
    label: p.label,
    value: Number(p.value) || 0,
  }));
}

export type SeriesProbe = {
  domain: InsightDomain;
  metricLabel: string;
  series: MetricSeriesPoint[];
};

export function probesFromDashboardCharts(charts: {
  faturamentoDiario?: DashboardChartPoint[];
  receitasVsDespesas?: DashboardChartPoint[];
  fluxoAcumulado?: DashboardChartPoint[];
  ebitdaEvolucao?: DashboardChartPoint[];
} | null | undefined): SeriesProbe[] {
  if (!charts) return [];
  const probes: SeriesProbe[] = [];
  const fat = chartPointsToSeries(charts.faturamentoDiario);
  if (fat.length) {
    probes.push({
      domain: "dashboard",
      metricLabel: "Faturamento diário",
      series: fat,
    });
  }
  const fluxo = chartPointsToSeries(charts.fluxoAcumulado);
  if (fluxo.length) {
    probes.push({
      domain: "fluxo_caixa",
      metricLabel: "Fluxo acumulado",
      series: fluxo,
    });
  }
  const ebitda = chartPointsToSeries(charts.ebitdaEvolucao);
  if (ebitda.length) {
    probes.push({
      domain: "dre",
      metricLabel: "EBITDA",
      series: ebitda,
    });
  }
  return probes;
}
