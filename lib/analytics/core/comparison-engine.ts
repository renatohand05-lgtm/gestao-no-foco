/**
 * Fase 23 — Comparativos com polaridade do catálogo.
 */

import type {
  MetricComparison,
  MetricPolarity,
  MetricResult,
} from "./metric-types.ts";

function safeRatio(num: number, den: number): number | null {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  const r = num / den;
  return Number.isFinite(r) ? r : null;
}

function finiteOrNull(n: number | null | undefined): number | null {
  if (n == null) return null;
  return Number.isFinite(n) ? n : null;
}

export function compareMetricValues(args: {
  definitionId: string;
  current: number | null;
  previous: number | null;
  polarity: MetricPolarity;
}): MetricComparison {
  const { definitionId, polarity } = args;
  const current = finiteOrNull(args.current);
  const previous = finiteOrNull(args.previous);

  if (current == null || previous == null) {
    return {
      definitionId,
      current,
      previous,
      delta: null,
      deltaPercent: null,
      trend: "neutral",
      tone: "neutral",
      polarity,
      explanation:
        "Comparativo indisponível — valor atual ou anterior ausente/inválido (sem estimativa).",
    };
  }

  const rawDelta = current - previous;
  const delta = Number.isFinite(rawDelta)
    ? Math.round((rawDelta + Number.EPSILON) * 100) / 100
    : null;
  if (delta == null) {
    return {
      definitionId,
      current,
      previous,
      delta: null,
      deltaPercent: null,
      trend: "neutral",
      tone: "neutral",
      polarity,
      explanation: "Comparativo indisponível — delta não finito.",
    };
  }

  const deltaPercent = safeRatio(delta, Math.abs(previous));
  const trend =
    delta > 0 ? "up" : delta < 0 ? "down" : ("neutral" as const);

  let tone: MetricComparison["tone"] = "neutral";
  if (trend !== "neutral") {
    if (polarity === "higher_is_better") {
      tone = trend === "up" ? "positive" : "negative";
    } else if (polarity === "lower_is_better") {
      tone = trend === "down" ? "positive" : "negative";
    } else {
      tone = "neutral";
    }
  }

  const pctLabel =
    deltaPercent == null ? "n/d" : `${(deltaPercent * 100).toFixed(1)}%`;

  return {
    definitionId,
    current,
    previous,
    delta,
    deltaPercent,
    trend,
    tone,
    polarity,
    explanation: `Δ ${delta} (${pctLabel}) · polaridade ${polarity} · tom ${tone}.`,
  };
}

export function compareMetricResults(
  current: MetricResult,
  previous: MetricResult | null,
  polarity: MetricPolarity,
): MetricComparison {
  return compareMetricValues({
    definitionId: current.definitionId,
    current: current.value,
    previous: previous?.value ?? null,
    polarity,
  });
}
