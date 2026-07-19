import {
  confidenceNumeric,
} from "@/lib/predictions/confidence";
import {
  PREDICTION_EFFORT,
  PREDICTION_IMPACT,
  PREDICTION_RISK,
} from "@/lib/predictions/thresholds";
import type {
  PredictionConfidence,
  ScenarioCardModel,
  ScenarioKind,
  ScenarioViability,
  ProbabilityEstimate,
} from "@/lib/predictions/types";

export type EffortHints = {
  kind: ScenarioKind;
  percentDelta?: number;
  days?: number;
  liftPercent?: number;
};

export type ScoreScenarioInput = {
  id: string;
  kind: ScenarioKind;
  name: string;
  description: string;
  confidence: PredictionConfidence;
  projectedRevenue: number;
  projectedAttainment: number | null;
  projectedGap: number | null;
  probability: ProbabilityEstimate;
  estimatedIncrement: number;
  viability: ScenarioViability;
  viabilityLabel: string;
  effortHints: EffortHints;
  baseRevenue: number;
  meta: number | null;
  gapBase: number | null;
};

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(100, Math.max(0, n)));
}

/**
 * Esforço 0–100
 * - base: mínimo
 * - média diária / ticket: proporcional ao |%|
 * - recuperação: dias × lift
 * - necessário meta: |growth| (cap 100)
 */
export function computeEffortScore(hints: EffortHints): number {
  switch (hints.kind) {
    case "base":
      return PREDICTION_EFFORT.base;
    case "daily_average":
      return clampScore(
        Math.abs(hints.percentDelta ?? 0) * PREDICTION_EFFORT.dailyPerPercent,
      );
    case "ticket":
      return clampScore(
        Math.abs(hints.percentDelta ?? 0) * PREDICTION_EFFORT.ticketPerPercent,
      );
    case "recovery":
      return clampScore(
        (hints.days ?? 0) * PREDICTION_EFFORT.recoveryPerDay +
          (hints.liftPercent ?? 0) * PREDICTION_EFFORT.recoveryPerLiftPercent,
      );
    case "required_for_meta":
      return clampScore(
        Math.min(
          PREDICTION_EFFORT.requiredCap,
          Math.abs(hints.percentDelta ?? 0) * PREDICTION_EFFORT.dailyPerPercent,
        ),
      );
    default:
      return 50;
  }
}

/**
 * Impacto 0–100 — quanto o incremento fecha o gap (ou ganho vs base).
 */
export function computeImpactScore(input: {
  estimatedIncrement: number;
  gapBase: number | null;
  baseRevenue: number;
  projectedRevenue: number;
}): number {
  const gap = input.gapBase;
  if (gap !== null && gap > 0) {
    const closed = Math.max(0, input.estimatedIncrement) / gap;
    return clampScore(closed * PREDICTION_IMPACT.gapCloseFull);
  }
  if (gap !== null && gap <= 0) {
    // Já no alvo — impacto positivo se aumenta receita
    const lift =
      input.baseRevenue > 0
        ? input.estimatedIncrement / input.baseRevenue
        : 0;
    return clampScore(Math.max(0, lift) * 200);
  }
  // Sem meta: impacto relativo ao incremento vs receita base
  if (input.baseRevenue > 0) {
    return clampScore(
      (Math.abs(input.estimatedIncrement) / input.baseRevenue) * 200,
    );
  }
  return 0;
}

/**
 * Risco 0–100 — confiança + viabilidade + downside de queda.
 */
export function computeRiskScore(input: {
  confidence: PredictionConfidence;
  viability: ScenarioViability;
  estimatedIncrement: number;
}): number {
  let risk: number = PREDICTION_RISK.confiancaAlta;
  if (input.confidence === "baixa") risk = PREDICTION_RISK.confiancaBaixa;
  else if (input.confidence === "media") risk = PREDICTION_RISK.confiancaMedia;

  risk += PREDICTION_RISK.viabilityAdd[input.viability];
  if (input.estimatedIncrement < 0) risk += 15;
  return clampScore(risk);
}

export function scoreScenario(input: ScoreScenarioInput): ScenarioCardModel {
  return {
    id: input.id,
    kind: input.kind,
    name: input.name,
    description: input.description,
    effortScore: computeEffortScore(input.effortHints),
    impactScore: computeImpactScore({
      estimatedIncrement: input.estimatedIncrement,
      gapBase: input.gapBase,
      baseRevenue: input.baseRevenue,
      projectedRevenue: input.projectedRevenue,
    }),
    riskScore: computeRiskScore({
      confidence: input.confidence,
      viability: input.viability,
      estimatedIncrement: input.estimatedIncrement,
    }),
    confidence: input.confidence,
    projectedRevenue: input.projectedRevenue,
    projectedAttainment: input.projectedAttainment,
    projectedGap: input.projectedGap,
    probability: input.probability,
    estimatedIncrement: input.estimatedIncrement,
    viability: input.viability,
    viabilityLabel: input.viabilityLabel,
  };
}

/**
 * Ordena cenários por saldo impacto − esforço − risco (comparação).
 */
export function compareScenarios(
  scenarios: ScenarioCardModel[],
): ScenarioCardModel[] {
  return [...scenarios].sort((a, b) => {
    const scoreA =
      a.impactScore * 0.4 -
      a.effortScore * 0.3 -
      a.riskScore * 0.2 +
      confidenceNumeric(a.confidence) * 0.1;
    const scoreB =
      b.impactScore * 0.4 -
      b.effortScore * 0.3 -
      b.riskScore * 0.2 +
      confidenceNumeric(b.confidence) * 0.1;
    return scoreB - scoreA;
  });
}
