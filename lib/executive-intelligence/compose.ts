/**
 * Composer da Inteligência Executiva (Sprint 29.4).
 * Separação: cálculo (engines existentes) → insight (sinais) → apresentação (UI).
 * Sem I/O · sem LLM · sem novas fórmulas de score.
 */

import type { BusinessHealthResult } from "../dashboard/business-health-engine.ts";
import type { ExecutiveAiResult } from "../ai/executive-ai-types.ts";
import type { DashboardCharts } from "../../types/dashboard-executive.ts";

import { getExecutiveAiFutureHook } from "./ai-hook.ts";
import { buildCriticalIndicators } from "./alerts.ts";
import { probesFromDashboardCharts, type SeriesProbe } from "./adapters/from-charts.ts";
import {
  mergeRecommendationBlueprints,
  recommendationsFromBusinessHealth,
  recommendationsFromExecutiveAi,
} from "./recommendations.ts";
import { domainRecommendationsFromDiagnostics } from "./adapters/from-executive-ai.ts";
import { resolveNamedScores } from "./scores.ts";
import { detectAnomaly } from "./signals/anomaly.ts";
import { detectSeasonalityHint } from "./signals/seasonality.ts";
import { detectTrend } from "./signals/trend.ts";
import type {
  ExecutiveInsightSignal,
  ExecutiveIntelligencePack,
  MetricSeriesPoint,
} from "./types.ts";

export const EXECUTIVE_INTELLIGENCE_VERSION = "29.4.0";

export function runSignalsOnSeries(
  series: MetricSeriesPoint[],
  domain: SeriesProbe["domain"],
  metricLabel: string,
): ExecutiveInsightSignal[] {
  return [
    detectTrend(series, domain, metricLabel),
    detectAnomaly(series, domain, metricLabel),
    detectSeasonalityHint(series, domain, metricLabel),
  ];
}

export function composeEnterpriseInsights(input: {
  ai?: ExecutiveAiResult | null;
  businessHealth?: BusinessHealthResult | null;
  charts?: DashboardCharts | null;
  extraProbes?: SeriesProbe[];
  generatedAt?: string;
}): ExecutiveIntelligencePack {
  const scores = resolveNamedScores({
    ai: input.ai,
    businessHealth: input.businessHealth,
  });

  const probes: SeriesProbe[] = [
    ...probesFromDashboardCharts(input.charts),
    ...(input.extraProbes ?? []),
  ];

  const signals: ExecutiveInsightSignal[] = [];
  for (const probe of probes) {
    signals.push(
      ...runSignalsOnSeries(probe.series, probe.domain, probe.metricLabel),
    );
  }

  const recommendations = mergeRecommendationBlueprints([
    recommendationsFromExecutiveAi(input.ai),
    recommendationsFromBusinessHealth(input.businessHealth),
    domainRecommendationsFromDiagnostics(input.ai),
  ]);

  const criticalIndicators = buildCriticalIndicators({ scores, signals });

  return {
    version: EXECUTIVE_INTELLIGENCE_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    scores,
    signals,
    recommendations,
    criticalIndicators,
    aiHook: getExecutiveAiFutureHook(),
  };
}
