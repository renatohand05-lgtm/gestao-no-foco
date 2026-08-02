/**
 * Implementação de sinais/scores/alertas (Sprint 29.4).
 * Entrada pública oficial: `@/lib/enterprise` (`composeEnterpriseInsights` / `runEnterpriseEngine`).
 * Não importar este pacote a partir de app/ ou components/.
 */

export type {
  AnomalyKind,
  AnomalySignal,
  ExecutiveAiFutureHook,
  ExecutiveAiFutureHookMode,
  ExecutiveInsightSignal,
  ExecutiveIntelligencePack,
  ExecutiveNamedScores,
  InsightDomain,
  MetricSeriesPoint,
  RecommendationBlueprint,
  SeasonalityHint,
  SeasonalitySignal,
  SignalSeverity,
  TrendDirection,
  TrendSignal,
} from "./types.ts";

export {
  composeEnterpriseInsights,
  composeEnterpriseInsights as runEnterpriseEngine,
  EXECUTIVE_INTELLIGENCE_VERSION,
  EXECUTIVE_INTELLIGENCE_VERSION as ENTERPRISE_INTELLIGENCE_VERSION,
  runSignalsOnSeries,
} from "./compose.ts";

export { detectTrend } from "./signals/trend.ts";
export { detectAnomaly } from "./signals/anomaly.ts";
export { detectSeasonalityHint } from "./signals/seasonality.ts";

export {
  resolveNamedScores,
  scoresFromBusinessHealth,
  scoresFromExecutiveAi,
} from "./scores.ts";

export {
  mergeRecommendationBlueprints,
  recommendationsFromBusinessHealth,
  recommendationsFromExecutiveAi,
} from "./recommendations.ts";

export { buildCriticalIndicators } from "./alerts.ts";
export {
  EXECUTIVE_AI_FUTURE_HOOK,
  getExecutiveAiFutureHook,
} from "./ai-hook.ts";

export {
  chartPointsToSeries,
  probesFromDashboardCharts,
} from "./adapters/from-charts.ts";
export type { SeriesProbe } from "./adapters/from-charts.ts";

export { domainRecommendationsFromDiagnostics } from "./adapters/from-executive-ai.ts";

export {
  presentEnterpriseInsightCards,
} from "./present.ts";
export type { ExecutiveInsightPresentationCard } from "./present.ts";
export type { CriticalIndicator } from "./alerts.ts";
