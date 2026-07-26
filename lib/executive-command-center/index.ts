export type {
  EccActionItem,
  EccActionStatus,
  EccAlertItem,
  EccAlertKind,
  EccConfidence,
  EccEvidence,
  EccExecutiveScore,
  EccForecastSlice,
  EccGoalsSlice,
  EccKpiItem,
  EccKpiKey,
  EccMorningBrief,
  EccOpportunityItem,
  EccOpportunityKind,
  EccPriorityItem,
  EccPriorityLevel,
  EccResult,
  EccRiskItem,
  EccUrgency,
} from "./types.ts";
export {
  ECC_ALERT_KIND_LABEL,
  ECC_ENGINE_VERSION,
  ECC_KPI_LABEL,
  ECC_OPPORTUNITY_KIND_LABEL,
  ECC_PRIORITY_LABEL,
  ECC_TOP_N,
  ECC_UNAVAILABLE_DRE_HINT,
  ECC_UNAVAILABLE_LABEL,
} from "./types.ts";
export {
  ExecutiveCommandCenterEngine,
  runExecutiveCommandCenter,
  type RunExecutiveCommandCenterInput,
} from "./engine.ts";
export {
  aggregateCommandSources,
  buildCommandForecasts,
  buildCommandGoals,
  buildCommandKpis,
  type CommandAggregate,
} from "./aggregator.ts";
export { resolveCommandExecutiveScore } from "./scoring.ts";
export { buildCommandPriorities } from "./priorities.ts";
export { buildCommandRisks } from "./risks.ts";
export { buildCommandOpportunities } from "./opportunities.ts";
export {
  buildCommandActions,
  buildCommandAlerts,
  resolveActionOwner,
  type EccOwnerArea,
} from "./actions.ts";
export {
  buildMorningBrief,
  buildSummaryLine,
  formatMoneyOrUnavailable,
  type EccHojeKpis,
} from "./summary.ts";
