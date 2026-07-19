/**
 * Thresholds do Prediction Engine (Sprint 11.3)
 */

/** Viabilidade pelo crescimento de média diária necessário (%). */
export const PREDICTION_VIABILITY_DAILY_GROWTH = {
  viavelMax: 15,
  agressivoMax: 50,
  improvavelMax: 150,
} as const;

/** Viabilidade por cobertura projetada vs meta. */
export const PREDICTION_VIABILITY_COVERAGE = {
  impossivelMax: 0.35,
  improvavelMax: 0.55,
  agressivoMax: 0.85,
} as const;

/** Esforço: peso por tipo de alavanca. */
export const PREDICTION_EFFORT = {
  base: 5,
  dailyPerPercent: 2.2,
  ticketPerPercent: 1.8,
  recoveryPerDay: 8,
  recoveryPerLiftPercent: 1.2,
  requiredCap: 100,
} as const;

/** Impacto: incremento relativo ao gap / meta. */
export const PREDICTION_IMPACT = {
  gapCloseFull: 100,
  softCap: 100,
} as const;

/** Risco: ajustes por confiança e viabilidade. */
export const PREDICTION_RISK = {
  confiancaBaixa: 35,
  confiancaMedia: 18,
  confiancaAlta: 5,
  viabilityAdd: {
    viavel: 0,
    agressivo: 20,
    improvavel: 40,
    impossivel: 55,
    dados_insuficientes: 45,
  },
} as const;

/** Pesos da recomendação (soma = 1). */
export const PREDICTION_RECOMMENDATION_WEIGHTS = {
  impact: 0.35,
  effortInverse: 0.25,
  riskInverse: 0.2,
  confidence: 0.1,
  proximity: 0.1,
} as const;

/** Confiança simulada — herança + penalidades. */
export const PREDICTION_CONFIDENCE = {
  minVendas: 3,
  minDias: 3,
} as const;

/** Defaults do simulador. */
export const PREDICTION_DEFAULT_SIMULATOR = {
  dailyAbsoluteDelta: 0,
  dailyPercentDelta: 10,
  ticketAbsoluteDelta: 0,
  ticketPercentDelta: 5,
  recoveryDays: 3,
  recoveryLiftPercent: 15,
} as const;

export const PREDICTION_MAX_SCENARIOS = 5;
export const PREDICTION_MIN_SCENARIOS = 3;
