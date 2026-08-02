/**
 * Detecção de tendência — puro, sobre série já calculada (Sprint 29.4).
 */

import type {
  InsightDomain,
  MetricSeriesPoint,
  SignalSeverity,
  TrendDirection,
  TrendSignal,
} from "../types.ts";

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function detectTrend(
  series: MetricSeriesPoint[],
  domain: InsightDomain,
  metricLabel = "série",
): TrendSignal {
  const values = series.map((p) => p.value).filter((n) => Number.isFinite(n));
  if (values.length < 2) {
    return {
      id: `trend.${domain}.insuficiente`,
      domain,
      kind: "tendencia",
      direction: "insuficiente",
      changeRatio: null,
      title: `Tendência de ${metricLabel} indisponível`,
      summary: "Pontos insuficientes para detectar crescimento ou queda.",
      severity: "info",
      evidence: [`n=${values.length}`],
    };
  }

  const mid = Math.floor(values.length / 2);
  const first = mean(values.slice(0, mid || 1));
  const second = mean(values.slice(mid));
  const base = Math.abs(first) < 1e-9 ? (second === 0 ? 1 : Math.abs(second)) : Math.abs(first);
  const changeRatio = (second - first) / base;

  let direction: TrendDirection = "estavel";
  let severity: SignalSeverity = "info";
  if (changeRatio >= 0.05) {
    direction = "crescimento";
    severity = "success";
  } else if (changeRatio <= -0.05) {
    direction = "queda";
    severity = "warning";
  }

  const pct = `${(changeRatio * 100).toFixed(1)}%`;
  return {
    id: `trend.${domain}.${direction}`,
    domain,
    kind: "tendencia",
    direction,
    changeRatio,
    title:
      direction === "crescimento"
        ? `${metricLabel}: tendência de crescimento`
        : direction === "queda"
          ? `${metricLabel}: tendência de queda`
          : `${metricLabel}: tendência estável`,
    summary:
      direction === "estavel"
        ? `Variação relativa ~${pct} entre a 1ª e a 2ª metade da série.`
        : `Variação relativa de ${pct} entre a 1ª e a 2ª metade da série (${values.length} pontos).`,
    severity,
    evidence: [
      `firstHalfAvg=${first.toFixed(2)}`,
      `secondHalfAvg=${second.toFixed(2)}`,
      `changeRatio=${changeRatio.toFixed(4)}`,
      `n=${values.length}`,
    ],
  };
}
