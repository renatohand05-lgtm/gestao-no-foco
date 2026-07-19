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
} from "@/lib/predictions/projection-math";
import type {
  BaseScenarioResult,
  PredictionInput,
  PredictionStatus,
  RecoveryScenarioResult,
} from "@/lib/predictions/types";

function resolveBaseStatus(input: PredictionInput): PredictionStatus {
  if (input.periodoFuturo) return "periodo_futuro";
  if (!input.possuiMeta) return "sem_meta";
  if (
    input.confianca === "baixa" &&
    (input.quantidadeVendas < 3 || input.diasUteisDecorridos < 3)
  ) {
    return "dados_insuficientes";
  }

  const attainment = projectedAttainment(
    input.periodoEncerrado ? input.realizado : input.projecaoDiasUteis,
    input.metaMensal,
  );

  if (attainment !== null && attainment > 100) return "meta_superada";
  if (attainment !== null && attainment >= 100) return "meta_atingida";
  if (input.periodoEncerrado) return "periodo_encerrado";

  if (attainment !== null && attainment < 70) return "critico";
  if (attainment !== null && attainment < 90) return "atencao";
  if (input.tendencia === "crescente") return "recuperacao";
  return "no_ritmo";
}

/**
 * Cenário base: mantendo o ritmo atual (projeção já carregada).
 */
export function buildBaseScenario(input: PredictionInput): BaseScenarioResult {
  const confidence = resolvePredictionConfidence(input);
  const projectedRevenue = input.periodoEncerrado
    ? input.realizado
    : input.projecaoDiasUteis;
  const attainment = projectedAttainment(projectedRevenue, input.metaMensal);
  const gap = projectedGap(projectedRevenue, input.metaMensal);
  const status = resolveBaseStatus(input);

  const probability = input.possuiMeta
    ? {
        label: input.probabilidadeMeta,
        score: input.probabilidadeScore,
        motivo:
          "Probabilidade oficial do painel comercial (ritmo atual, sem alteração).",
      }
    : estimateProbabilityForProjection(input, projectedRevenue);

  let explanation: string;
  if (input.periodoFuturo) {
    explanation =
      "A competência ainda não começou — a projeção permanece informativa.";
  } else if (!input.possuiMeta) {
    explanation = `Mantendo o ritmo atual, a projeção útil fica em ${projectedRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (sem meta para comparar).`;
  } else if (input.periodoEncerrado) {
    explanation = `Com o mês encerrado, o realizado fecha em ${projectedRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}${
      attainment !== null
        ? ` (${attainment.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da meta)`
        : ""
    }.`;
  } else {
    explanation = `Mantendo a média útil de ${input.mediaDiariaAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} nos ${input.diasUteisRestantes} dia(s) restante(s), a projeção útil é ${projectedRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`;
  }

  return {
    projectedRevenue,
    projectedAttainment: attainment,
    projectedGap: gap,
    probability,
    confidence,
    status,
    explanation,
    viability: classifyCoverageViability(
      projectedRevenue,
      input.metaMensal,
      input,
    ),
  };
}

export type RecoveryParams = {
  days: number;
  liftPercent: number;
};

/**
 * Simula N dias consecutivos acima da meta diária (necessário/dia ou média).
 */
export function simulateRecoveryDays(
  input: PredictionInput,
  params: RecoveryParams,
): RecoveryScenarioResult {
  const confidence = resolvePredictionConfidence(input);
  const recoveredDays = Math.max(
    0,
    Math.min(Math.floor(params.days), Math.max(0, input.diasUteisRestantes)),
  );
  const lift = Math.max(0, params.liftPercent);

  const dailyTarget =
    input.necessarioDiaUtil !== null && input.necessarioDiaUtil > 0
      ? input.necessarioDiaUtil
      : input.mediaDiariaAtual;

  const liftedDaily = clampNonNegative(dailyTarget * (1 + lift / 100));
  const remainingAfter = Math.max(0, input.diasUteisRestantes - recoveredDays);

  let projectedRevenue = input.realizado;
  let estimatedIncrement = 0;
  let assumption: string;

  if (input.periodoEncerrado || input.diasUteisRestantes <= 0) {
    projectedRevenue = input.realizado;
    assumption =
      "Período encerrado — não há dias úteis restantes para recuperação.";
  } else if (recoveredDays === 0) {
    projectedRevenue =
      input.realizado + input.mediaDiariaAtual * input.diasUteisRestantes;
    assumption = "Nenhum dia de recuperação aplicado.";
  } else {
    const recoveryBlock = liftedDaily * recoveredDays;
    const restBlock = input.mediaDiariaAtual * remainingAfter;
    const baseBlock = input.mediaDiariaAtual * input.diasUteisRestantes;
    projectedRevenue = input.realizado + recoveryBlock + restBlock;
    estimatedIncrement = recoveryBlock + restBlock - baseBlock;
    assumption = `Nos próximos ${recoveredDays} dia(s) útil(is), a média sobe para ${liftedDaily.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (${lift.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% acima da referência diária de ${dailyTarget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}); depois volta à média atual.`;
  }

  const growthVsMedia =
    input.mediaDiariaAtual > 0
      ? ((liftedDaily - input.mediaDiariaAtual) / input.mediaDiariaAtual) * 100
      : lift;

  const viability = worstViability(
    classifyDailyGrowthViability(growthVsMedia, input),
    classifyCoverageViability(projectedRevenue, input.metaMensal, input),
  );

  return {
    recoveredDays,
    targetLiftPercent: lift,
    estimatedIncrement,
    projectedRevenue,
    projectedAttainment: projectedAttainment(projectedRevenue, input.metaMensal),
    projectedGap: projectedGap(projectedRevenue, input.metaMensal),
    probability: estimateProbabilityForProjection(input, projectedRevenue),
    confidence,
    viability,
    assumption,
  };
}
