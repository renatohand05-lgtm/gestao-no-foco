/**
 * Fase 23 — Analytics Enterprise · API pública.
 */

export type * from "./core/metric-types.ts";
export type { AnalyticsDomainSnapshot } from "./core/analytics-context.ts";
export {
  METRIC_CATALOG,
  getMetricDefinition,
  listMetricsByArea,
  listAvailableMetrics,
} from "./core/metric-registry.ts";
export {
  resolvePeriodPreset,
  previousPeriodOf,
  todayUtc,
  emptyFilter,
  sanitizeMetricFilter,
  assertPeriodPreset,
  isValidIsoDate,
} from "./core/filter-engine.ts";
export { compareMetricValues, compareMetricResults } from "./core/comparison-engine.ts";
export { csvEscapeCell, buildAnalyticsCsv } from "./core/csv-safe.ts";
export {
  movingAverage,
  linearSlope,
  projectFromTrend,
  buildMetricTrend,
} from "./core/trend-engine.ts";
export { buildDrillDown, emptyDrillDown } from "./core/drill-down-engine.ts";
export {
  resolveMetric,
  resolveCatalogMetrics,
  buildComparisons,
  buildTargetForMetric,
  buildTrendForMetric,
  buildMetricDrillDownFromSnapshot,
  analyticsPermissionSatisfied,
} from "./core/analytics-engine.ts";
export { buildAnalyticsAlerts, dedupeAlerts } from "./insights/alert-engine.ts";
export {
  deterministicExecutiveProvider,
  externalExecutiveStubProvider,
  mockExecutiveProvider,
  resolveExecutiveProvider,
} from "./providers/executive-intelligence-provider.ts";
export {
  isAnalyticsEnabled,
  isAnalyticsExternalAiEnabled,
  getAnalyticsFeatureFlags,
} from "./analytics-feature-flags.ts";
export {
  createDefaultAnalyticsLayout,
  mergeAnalyticsLayout,
  DEFAULT_EXECUTIVE_WIDGETS,
} from "./persistence/dashboard-layout-store.ts";
export {
  buildExecutiveAnalyticsBundle,
  analyticsDrillDown,
  buildAnalyticsExportStatuses,
} from "./analytics-orchestrator.ts";
