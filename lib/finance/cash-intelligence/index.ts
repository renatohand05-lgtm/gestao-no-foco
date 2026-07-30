/**
 * Sprint 22.6.2 — Cash Intelligence · API pública do módulo.
 */

export type * from "./types.ts";
export {
  computeConsolidatedBalance,
  transferConsolidatedNetImpact,
} from "./consolidated-balance-service.ts";
export {
  buildCashLayers,
  movementToRealizedLine,
  titleToForecastLine,
  expandRecurringToForecast,
  buildProjectedLines,
} from "./cashflow-layers-service.ts";
export { projectCashflow } from "./cashflow-projection-service.ts";
export { computeWorkingCapital } from "./working-capital-service.ts";
export { buildCashRiskAlerts } from "./cash-risk-service.ts";
export {
  simulateScenario,
  compareScenarios,
} from "./scenario-simulator-service.ts";
export {
  buildRescheduleRecommendations,
  confirmRecommendation,
  deterministicRescheduleProvider,
  type RecommendationProvider,
} from "./payment-rescheduling-service.ts";
export { buildDrillDown } from "./drill-down-service.ts";
export {
  buildExecutiveCashDashboard,
  cashIntelligenceDrillDown,
  cashIntelligenceRecommendations,
  cashIntelligenceSimulate,
  type CashIntelligenceSnapshot,
} from "./cash-intelligence-service.ts";
export {
  toDateOnly,
  addDays,
  todayUtc,
  daysBetween,
  eachDay,
  roundMoney,
} from "./date-utils.ts";
