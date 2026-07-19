import {
  PREDICTION_CONFIDENCE,
  PREDICTION_VIABILITY_COVERAGE,
  PREDICTION_VIABILITY_DAILY_GROWTH,
} from "@/lib/predictions/thresholds";
import type {
  PredictionConfidence,
  PredictionInput,
  ScenarioViability,
} from "@/lib/predictions/types";

/**
 * Resolve confiança da simulação a partir da amostra (sem inventar).
 */
export function resolvePredictionConfidence(
  input: PredictionInput,
): PredictionConfidence {
  if (
    input.quantidadeVendas < PREDICTION_CONFIDENCE.minVendas ||
    input.diasUteisDecorridos < PREDICTION_CONFIDENCE.minDias
  ) {
    return "baixa";
  }
  return input.confianca;
}

export function confidenceLabel(c: PredictionConfidence): string {
  if (c === "baixa") return "Confiança baixa";
  if (c === "media") return "Confiança média";
  return "Confiança alta";
}

export function confidenceNumeric(c: PredictionConfidence): number {
  if (c === "alta") return 85;
  if (c === "media") return 60;
  return 30;
}

/**
 * Classifica viabilidade de um lift de média diária (%).
 */
export function classifyDailyGrowthViability(
  growthPercent: number | null,
  input: PredictionInput,
): ScenarioViability {
  if (input.periodoFuturo || (!input.possuiMeta && growthPercent === null)) {
    return "dados_insuficientes";
  }
  if (
    input.quantidadeVendas < PREDICTION_CONFIDENCE.minVendas &&
    input.diasUteisDecorridos < PREDICTION_CONFIDENCE.minDias
  ) {
    return "dados_insuficientes";
  }
  if (growthPercent === null || !Number.isFinite(growthPercent)) {
    return "dados_insuficientes";
  }
  const g = Math.abs(growthPercent);
  if (g <= PREDICTION_VIABILITY_DAILY_GROWTH.viavelMax) return "viavel";
  if (g <= PREDICTION_VIABILITY_DAILY_GROWTH.agressivoMax) return "agressivo";
  if (g <= PREDICTION_VIABILITY_DAILY_GROWTH.improvavelMax) return "improvavel";
  return "impossivel";
}

/**
 * Viabilidade pela cobertura projetada/meta.
 */
export function classifyCoverageViability(
  projectedRevenue: number,
  meta: number | null,
  input: PredictionInput,
): ScenarioViability {
  if (!meta || meta <= 0) return "dados_insuficientes";
  if (input.periodoFuturo) return "dados_insuficientes";
  const coverage = projectedRevenue / meta;
  if (coverage >= PREDICTION_VIABILITY_COVERAGE.agressivoMax) return "viavel";
  if (coverage >= PREDICTION_VIABILITY_COVERAGE.improvavelMax)
    return "agressivo";
  if (coverage >= PREDICTION_VIABILITY_COVERAGE.impossivelMax)
    return "improvavel";
  return "impossivel";
}

export function viabilityLabel(v: ScenarioViability): string {
  switch (v) {
    case "viavel":
      return "Cenário viável";
    case "agressivo":
      return "Cenário agressivo";
    case "improvavel":
      return "Cenário improvável";
    case "impossivel":
      return "Cenário impossível com os dados atuais";
    default:
      return "Dados insuficientes";
  }
}

/**
 * Escolhe a pior viabilidade entre candidatas (para alertas).
 */
export function worstViability(
  a: ScenarioViability,
  b: ScenarioViability,
): ScenarioViability {
  const order: ScenarioViability[] = [
    "viavel",
    "agressivo",
    "improvavel",
    "impossivel",
    "dados_insuficientes",
  ];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}
