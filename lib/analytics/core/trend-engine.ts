/**
 * Fase 23 — Tendências e projeções determinísticas.
 * Nunca apresenta projeção como certeza.
 */

import type {
  MetricConfidence,
  MetricTrend,
  MetricTrendPoint,
} from "./metric-types.ts";

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Média móvel simples dos últimos `window` pontos disponíveis. */
export function movingAverage(
  points: MetricTrendPoint[],
  window = 3,
): number | null {
  const vals = points
    .map((p) => p.value)
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (vals.length < Math.min(2, window)) return null;
  return avg(vals.slice(-window));
}

/** Inclinação linear simples (índice x valor) — sem libs externas. */
export function linearSlope(points: MetricTrendPoint[]): number | null {
  const pairs = points
    .map((p, i) => ({ x: i, y: p.value }))
    .filter((p): p is { x: number; y: number } => p.y != null);
  const n = pairs.length;
  if (n < 2) return null;
  const meanX = pairs.reduce((s, p) => s + p.x, 0) / n;
  const meanY = pairs.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pairs) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  if (den === 0) return null;
  return num / den;
}

export type ProjectionScenario = "conservative" | "base" | "optimistic";

export function projectFromTrend(args: {
  definitionId: string;
  points: MetricTrendPoint[];
  horizonDays: 30 | 60 | 90 | 180 | 365;
  scenario?: ProjectionScenario;
}): {
  projected: number | null;
  scenario: ProjectionScenario;
  confidence: MetricConfidence;
  methodology: string;
  limitations: string[];
} {
  const scenario = args.scenario ?? "base";
  const vals = args.points
    .map((p) => p.value)
    .filter((v): v is number => v != null);
  if (vals.length < 3) {
    return {
      projected: null,
      scenario,
      confidence: "none",
      methodology: "Dados insuficientes para projeção determinística.",
      limitations: ["Mínimo de 3 pontos históricos necessários."],
    };
  }

  const last = vals[vals.length - 1]!;
  const slope = linearSlope(args.points) ?? 0;
  const steps = Math.max(1, Math.round(args.horizonDays / 30));
  let factor = 1;
  if (scenario === "conservative") factor = 0.85;
  if (scenario === "optimistic") factor = 1.15;

  const projected =
    Math.round((last + slope * steps * factor + Number.EPSILON) * 100) / 100;

  return {
    projected,
    scenario,
    confidence: vals.length >= 6 ? "medium" : "low",
    methodology:
      "Projeção determinística: último valor + inclinação linear × horizonte × fator de cenário. Não é certeza.",
    limitations: [
      "Não modela sazonalidade sem série longa.",
      "Não usa IA externa.",
      `Cenário ${scenario} é hipotético.`,
    ],
  };
}

export function buildMetricTrend(args: {
  definitionId: string;
  points: MetricTrendPoint[];
  updatedAt: string;
}): MetricTrend {
  const vals = args.points.filter((p) => p.value != null);
  const ma = movingAverage(args.points, 3);
  const slope = linearSlope(args.points);
  const limitations: string[] = [];
  if (vals.length < 3) {
    limitations.push("Série curta — tendência pouco confiável.");
  }
  limitations.push("Análise baseada em regras e histórico do tenant.");

  return {
    definitionId: args.definitionId,
    points: args.points,
    movingAverage: ma,
    linearSlope: slope,
    methodology:
      "Média móvel simples (3) + inclinação linear determinística.",
    confidence: vals.length >= 6 ? "medium" : vals.length >= 3 ? "low" : "none",
    dataPoints: vals.length,
    limitations,
    updatedAt: args.updatedAt,
  };
}
