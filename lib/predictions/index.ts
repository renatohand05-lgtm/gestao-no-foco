/**
 * Prediction & Scenario Engine — Sprint 11.3
 * Funções puras. Zero I/O.
 */

export {
  buildPredictionEngine,
  toPredictionInput,
  runCustomSimulations,
} from "@/lib/predictions/prediction-engine";
export { buildBaseScenario, simulateRecoveryDays } from "@/lib/predictions/revenue-simulator";
export {
  simulateDailyAverage,
  simulateDailyAveragePercent,
} from "@/lib/predictions/daily-target-simulator";
export {
  simulateTicket,
  simulateTicketPercent,
} from "@/lib/predictions/ticket-simulator";
export {
  buildDefaultScenarios,
  buildRequiredForMeta,
} from "@/lib/predictions/scenario-builder";
export {
  scoreScenario,
  compareScenarios,
  computeEffortScore,
  computeImpactScore,
  computeRiskScore,
} from "@/lib/predictions/scenario-comparator";
export { recommendBestScenario } from "@/lib/predictions/scenario-recommendation";
export {
  resolvePredictionConfidence,
  viabilityLabel,
  classifyDailyGrowthViability,
} from "@/lib/predictions/confidence";
export { PREDICTION_DEFAULT_SIMULATOR } from "@/lib/predictions/thresholds";

export type {
  PredictionInput,
  PredictionEngineResult,
  PredictionSummary,
  BaseScenarioResult,
  DailyAverageScenarioResult,
  TicketScenarioResult,
  RecoveryScenarioResult,
  RequiredForMetaResult,
  ScenarioCardModel,
  ScenarioRecommendation,
  SimulatorParams,
  ScenarioViability,
  ScenarioKind,
} from "@/lib/predictions/types";
