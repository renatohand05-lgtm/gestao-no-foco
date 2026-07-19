export type {
  ExecutiveInsightType,
  ExecutiveInsightCategory,
  ExecutiveInsightSeverity,
  ExecutiveInsightConfidence,
  ExecutiveInsightSource,
  ExecutiveInsightStatus,
  ExecutiveInsightMetricRef,
  ExecutiveComposedInsight,
  ExecutiveInsightsSummary,
  ExecutiveInsightsPack,
} from "@/lib/executive-insights/executive-insight-types";

export {
  composeExecutiveInsights,
  type ComposeExecutiveInsightsInput,
} from "@/lib/executive-insights/executive-insight-engine";

export {
  INSIGHT_THEME_RULES,
  normalizeInsightText,
  resolveThemeKey,
} from "@/lib/executive-insights/executive-insight-rules";

export {
  dedupeInsights,
} from "@/lib/executive-insights/executive-insight-deduplication";

export {
  rankInsights,
  partitionTopInsights,
} from "@/lib/executive-insights/executive-insight-ranking";

export {
  buildExecutiveInsightsNarrative,
  sourceLabel,
} from "@/lib/executive-insights/executive-insight-formatters";
