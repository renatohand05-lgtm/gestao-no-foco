import {
  classifyCoverageViability,
  classifyDailyGrowthViability,
  resolvePredictionConfidence,
  worstViability,
} from "@/lib/predictions/confidence";
import {
  clampNonNegative,
  estimateProbabilityForProjection,
  projectedAttainment,
  projectedGap,
  revenueFromDailyAverage,
} from "@/lib/predictions/projection-math";
import type {
  DailyAverageScenarioResult,
  PredictionInput,
} from "@/lib/predictions/types";

export type DailyAverageParams = {
  /** Delta absoluto em R$ (pode ser negativo). */
  absoluteDelta?: number;
  /** Delta percentual sobre a média atual. */
  percentDelta?: number;
};

/**
 * Simula alteração da média diária útil no restante do período.
 */
export function simulateDailyAverage(
  input: PredictionInput,
  params: DailyAverageParams,
): DailyAverageScenarioResult {
  const confidence = resolvePredictionConfidence(input);
  const abs = params.absoluteDelta ?? 0;
  const pct = params.percentDelta ?? 0;

  let newDailyAverage = input.mediaDiariaAtual;
  if (params.absoluteDelta !== undefined && params.absoluteDelta !== 0) {
    newDailyAverage = input.mediaDiariaAtual + abs;
  } else if (params.percentDelta !== undefined) {
    newDailyAverage = input.mediaDiariaAtual * (1 + pct / 100);
  }
  newDailyAverage = clampNonNegative(newDailyAverage);

  const projectedRevenue = revenueFromDailyAverage(input, newDailyAverage);
  const baseRemaining =
    input.periodoEncerrado || input.diasUteisRestantes <= 0
      ? 0
      : input.mediaDiariaAtual * input.diasUteisRestantes;
  const newRemaining =
    input.periodoEncerrado || input.diasUteisRestantes <= 0
      ? 0
      : newDailyAverage * input.diasUteisRestantes;
  const estimatedIncrement = newRemaining - baseRemaining;

  const growthPct =
    input.mediaDiariaAtual > 0
      ? ((newDailyAverage - input.mediaDiariaAtual) / input.mediaDiariaAtual) *
        100
      : newDailyAverage > 0
        ? 100
        : 0;

  const viability = worstViability(
    classifyDailyGrowthViability(growthPct, input),
    classifyCoverageViability(projectedRevenue, input.metaMensal, input),
  );

  let requiredConsecutiveDays: number | null = null;
  if (
    input.possuiMeta &&
    input.metaMensal !== null &&
    estimatedIncrement > 0 &&
    newDailyAverage > input.mediaDiariaAtual &&
    input.diasUteisRestantes > 0
  ) {
    const gap = Math.max(0, input.metaMensal - input.projecaoDiasUteis);
    const dailyLift = newDailyAverage - input.mediaDiariaAtual;
    if (dailyLift > 0 && gap > 0) {
      requiredConsecutiveDays = Math.min(
        input.diasUteisRestantes,
        Math.ceil(gap / dailyLift),
      );
    } else if (gap <= 0) {
      requiredConsecutiveDays = 0;
    }
  }

  const assumption =
    params.absoluteDelta !== undefined && params.absoluteDelta !== 0
      ? `Média diária alterada em ${abs >= 0 ? "+" : ""}${abs.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por dia útil restante; dias já realizados permanecem iguais.`
      : `Média diária alterada em ${pct >= 0 ? "+" : ""}${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% sobre a média útil atual; dias já realizados permanecem iguais.`;

  return {
    newDailyAverage,
    projectedRevenue,
    projectedAttainment: projectedAttainment(projectedRevenue, input.metaMensal),
    projectedGap: projectedGap(projectedRevenue, input.metaMensal),
    probability: estimateProbabilityForProjection(input, projectedRevenue),
    estimatedIncrement,
    requiredConsecutiveDays,
    confidence,
    viability,
    assumption,
  };
}

/** Atalhos percentuais usados nos cenários padrão. */
export function simulateDailyAveragePercent(
  input: PredictionInput,
  percentDelta: number,
): DailyAverageScenarioResult {
  return simulateDailyAverage(input, { percentDelta });
}

export function dailyGrowthNeededPercent(
  input: PredictionInput,
): number | null {
  if (
    !input.possuiMeta ||
    input.necessarioDiaUtil === null ||
    input.mediaDiariaAtual <= 0
  ) {
    if (
      input.possuiMeta &&
      input.metaMensal !== null &&
      input.diasUteisRestantes > 0 &&
      input.mediaDiariaAtual > 0
    ) {
      const needed =
        Math.max(0, input.metaMensal - input.realizado) /
        input.diasUteisRestantes;
      return ((needed - input.mediaDiariaAtual) / input.mediaDiariaAtual) * 100;
    }
    return null;
  }
  return (
    ((input.necessarioDiaUtil - input.mediaDiariaAtual) /
      input.mediaDiariaAtual) *
    100
  );
}
