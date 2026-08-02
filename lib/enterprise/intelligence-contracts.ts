/**
 * Sprint 29.6 — Contratos públicos da Enterprise Intelligence Engine.
 * Tipos canônicos reexportados; fórmulas permanecem nos engines de implementação.
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
} from "../executive-intelligence/types.ts";

export type {
  ExecutiveIntelligencePack as EnterpriseInsightsPack,
  ExecutiveNamedScores as EnterpriseNamedScores,
  RecommendationBlueprint as EnterpriseRecommendation,
} from "../executive-intelligence/types.ts";

export type {
  ExecutiveInsightPresentationCard as EnterpriseInsightCard,
} from "../executive-intelligence/present.ts";
export type { SeriesProbe } from "../executive-intelligence/adapters/from-charts.ts";
export type { CriticalIndicator } from "../executive-intelligence/alerts.ts";

export type {
  BusinessHealthResult,
  BusinessHealthModuleResult,
  BusinessHealthStatus,
  BusinessHealthPriorityItem,
  BusinessHealthEvidenceItem,
  BusinessHealthConfidenceLevel,
  BusinessHealthModuleKey,
} from "../dashboard/business-health-engine.ts";

export type {
  ExecutiveAiResult,
  ExecutiveAiInput,
  ExecutiveAiModule,
  ExecutiveAiHealth,
  ExecutiveAiSeverity,
} from "../ai/executive-ai-types.ts";

export type { ExecutiveIntelligenceData } from "../dashboard/executive-intelligence-types.ts";
export type { ExecutiveIntelligenceFeeds } from "../dashboard/ops-executive-intelligence.ts";
