/**
 * Sprint 29.6 — Enterprise Intelligence Engine (única entrada oficial de inteligência).
 *
 * Nomenclatura:
 * | Nome | Papel |
 * |------|--------|
 * | `composeEnterpriseInsights` / `runEnterpriseEngine` | Pack unificado |
 * | `presentEnterpriseInsightCards` | Apresentação do pack |
 * | `composeOpsExecutiveIntelligence` | Ops/fluxo (dashboard) |
 * | `composeCommercialExecutiveIntelligence` | EI comercial (legado) |
 * | `runExecutiveAiEngine` / `runBusinessHealthEngine` | Scores canônicos |
 *
 * Sem I/O. Sem self-import de `@/lib/enterprise`.
 * Implementação: `lib/executive-intelligence`, `lib/ai`, `lib/dashboard/*-engine`.
 */

export type * from "./intelligence-contracts.ts";

export {
  composeEnterpriseInsights,
  runEnterpriseEngine,
  EXECUTIVE_INTELLIGENCE_VERSION as ENTERPRISE_INTELLIGENCE_VERSION,
  runSignalsOnSeries,
  detectTrend,
  detectAnomaly,
  detectSeasonalityHint,
  resolveNamedScores,
  scoresFromBusinessHealth,
  scoresFromExecutiveAi,
  mergeRecommendationBlueprints,
  recommendationsFromBusinessHealth,
  recommendationsFromExecutiveAi,
  buildCriticalIndicators,
  EXECUTIVE_AI_FUTURE_HOOK,
  getExecutiveAiFutureHook,
  chartPointsToSeries,
  probesFromDashboardCharts,
  domainRecommendationsFromDiagnostics,
  presentEnterpriseInsightCards,
} from "../executive-intelligence/index.ts";

export { runExecutiveAiEngine } from "../ai/executive-ai-engine.ts";
export {
  runBusinessHealthEngine,
  BusinessHealthEngine,
  classifyBusinessHealthStatus,
  BUSINESS_HEALTH_ENGINE_VERSION,
  BUSINESS_HEALTH_STATUS_LABEL,
  BUSINESS_HEALTH_CONFIDENCE_LABEL,
} from "../dashboard/business-health-engine.ts";

export {
  composeOpsExecutiveIntelligence,
} from "../dashboard/ops-executive-intelligence.ts";
export type { ExecutiveIntelligenceFeeds } from "../dashboard/ops-executive-intelligence.ts";

export {
  composeCommercialExecutiveIntelligence,
  toExecutiveIntelligenceInput,
  buildExecutiveScore,
  buildExecutiveHealth,
  buildExecutiveInsights,
  buildExecutiveAction,
  buildExecutiveDiagnosis,
  buildExecutiveTimeline,
} from "../intelligence/index.ts";

