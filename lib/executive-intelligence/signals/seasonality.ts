/**
 * Hint de sazonalidade simples (autocorrelação lag-7 se n≥14) — Sprint 29.4.
 */

import type {
  InsightDomain,
  MetricSeriesPoint,
  SeasonalityHint,
  SeasonalitySignal,
} from "../types.ts";

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function pearson(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 3) return null;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    const xa = a[i]! - ma;
    const xb = b[i]! - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  if (da < 1e-12 || db < 1e-12) return null;
  return num / Math.sqrt(da * db);
}

export function detectSeasonalityHint(
  series: MetricSeriesPoint[],
  domain: InsightDomain,
  metricLabel = "série",
): SeasonalitySignal {
  const values = series.map((p) => p.value).filter((n) => Number.isFinite(n));
  if (values.length < 14) {
    return {
      id: `season.${domain}.insuficiente`,
      domain,
      kind: "sazonalidade",
      hint: "insuficiente",
      title: `Sazonalidade de ${metricLabel} indisponível`,
      summary: "É preciso ao menos 14 pontos para hint semanal.",
      severity: "info",
      evidence: [`n=${values.length}`],
    };
  }

  const lag = 7;
  const a = values.slice(0, values.length - lag);
  const b = values.slice(lag);
  const corr = pearson(a, b);
  let hint: SeasonalityHint = "sem_padrao";
  if (corr != null && corr >= 0.45) hint = "padrao_semanal";
  else if (values.length >= 28 && corr != null && corr >= 0.35) {
    hint = "padrao_mensal";
  }

  return {
    id: `season.${domain}.${hint}`,
    domain,
    kind: "sazonalidade",
    hint,
    title:
      hint === "padrao_semanal"
        ? `${metricLabel}: possível padrão semanal`
        : hint === "padrao_mensal"
          ? `${metricLabel}: possível padrão recorrente`
          : `${metricLabel}: sem padrão sazonal claro`,
    summary:
      corr == null
        ? "Correlação lag-7 indeterminada."
        : `Correlação lag-7 = ${corr.toFixed(2)} (heurística, não modelo estatístico formal).`,
    severity: "info",
    evidence: [
      `n=${values.length}`,
      `lag=${lag}`,
      `corr=${corr?.toFixed(4) ?? "null"}`,
    ],
  };
}
