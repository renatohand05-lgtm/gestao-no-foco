/**
 * Detecção de anomalias simples (desvio vs média) — Sprint 29.4.
 * Sem ML; limiar fixo documentado.
 */

import type {
  AnomalyKind,
  AnomalySignal,
  InsightDomain,
  MetricSeriesPoint,
  SignalSeverity,
} from "../types.ts";

const Z_THRESHOLD = 2.25;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const v =
    values.reduce((acc, n) => acc + (n - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

export function detectAnomaly(
  series: MetricSeriesPoint[],
  domain: InsightDomain,
  metricLabel = "série",
): AnomalySignal {
  const values = series.map((p) => p.value).filter((n) => Number.isFinite(n));
  if (values.length < 4) {
    return {
      id: `anomaly.${domain}.nenhuma`,
      domain,
      kind: "anomalia",
      anomaly: "nenhuma",
      title: `Anomalia de ${metricLabel} indisponível`,
      summary: "Série curta demais para desvio padrão confiável.",
      severity: "info",
      evidence: [`n=${values.length}`],
    };
  }

  const avg = mean(values);
  const sd = stdev(values, avg);
  if (sd < 1e-9) {
    return {
      id: `anomaly.${domain}.nenhuma`,
      domain,
      kind: "anomalia",
      anomaly: "nenhuma",
      title: `Sem anomalia em ${metricLabel}`,
      summary: "Variância nula na série observada.",
      severity: "info",
      evidence: [`mean=${avg.toFixed(2)}`, `stdev=0`],
    };
  }

  let bestIdx = 0;
  let bestAbsZ = 0;
  for (let i = 0; i < values.length; i++) {
    const z = Math.abs((values[i]! - avg) / sd);
    if (z > bestAbsZ) {
      bestAbsZ = z;
      bestIdx = i;
    }
  }

  if (bestAbsZ < Z_THRESHOLD) {
    return {
      id: `anomaly.${domain}.nenhuma`,
      domain,
      kind: "anomalia",
      anomaly: "nenhuma",
      title: `Sem anomalia relevante em ${metricLabel}`,
      summary: `Maior |z| = ${bestAbsZ.toFixed(2)} (limiar ${Z_THRESHOLD}).`,
      severity: "info",
      evidence: [`maxAbsZ=${bestAbsZ.toFixed(3)}`, `threshold=${Z_THRESHOLD}`],
    };
  }

  const point = series[bestIdx]!;
  const anomaly: AnomalyKind = point.value >= avg ? "pico" : "vale";
  const severity: SignalSeverity = anomaly === "pico" ? "warning" : "danger";

  return {
    id: `anomaly.${domain}.${anomaly}.${bestIdx}`,
    domain,
    kind: "anomalia",
    anomaly,
    title:
      anomaly === "pico"
        ? `Pico detectado em ${metricLabel}`
        : `Vale detectado em ${metricLabel}`,
    summary: `${point.label}: ${point.value.toLocaleString("pt-BR")} (|z|=${bestAbsZ.toFixed(2)}).`,
    severity,
    evidence: [
      `label=${point.label}`,
      `value=${point.value}`,
      `mean=${avg.toFixed(2)}`,
      `stdev=${sd.toFixed(2)}`,
      `z=${bestAbsZ.toFixed(3)}`,
    ],
    pointLabel: point.label,
    pointValue: point.value,
  };
}
