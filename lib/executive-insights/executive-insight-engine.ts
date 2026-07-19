/**
 * Motor de composição de insights (Sprint 13.14).
 * Consome somente resultados existentes · zero I/O · zero recálculo.
 */

import type { ActionCenterDecision } from "@/lib/action-center/types";
import type { BusinessIntelligenceResult } from "@/lib/business-intelligence/types";
import type { ExecutiveIntelligenceResult } from "@/lib/intelligence/types";
import type { PredictionEngineResult } from "@/lib/predictions/types";
import {
  mergeConfidence,
  pickConfidenceReason,
} from "@/lib/executive-insights/executive-insight-confidence";
import { dedupeInsights } from "@/lib/executive-insights/executive-insight-deduplication";
import { buildExecutiveInsightsNarrative } from "@/lib/executive-insights/executive-insight-formatters";
import {
  mapActionCenterToInsight,
  mapBusinessToInsights,
  mapIntelligenceToInsights,
  mapPredictionToInsights,
} from "@/lib/executive-insights/executive-insight-mappers";
import {
  partitionTopInsights,
  rankInsights,
} from "@/lib/executive-insights/executive-insight-ranking";
import type {
  ExecutiveInsightConfidence,
  ExecutiveInsightsPack,
  ExecutiveInsightsSummary,
} from "@/lib/executive-insights/executive-insight-types";

export type ComposeExecutiveInsightsInput = {
  business: BusinessIntelligenceResult;
  intelligence: ExecutiveIntelligenceResult;
  predictions: PredictionEngineResult;
  action: ActionCenterDecision;
  /** Confiança já calculada no painel comercial */
  confidence: ExecutiveInsightConfidence;
  confidenceReason: string;
  periodLabel?: string | null;
  referenceDate?: string | null;
};

function composeSummary(params: {
  business: BusinessIntelligenceResult;
  action: ActionCenterDecision;
  mainRisk: string | null;
  mainOpportunity: string | null;
}): ExecutiveInsightsSummary {
  const overallState = params.business.summary.headline.trim();
  const mainDeviation =
    params.business.summary.executiveSummary.trim() || null;
  const nextAction =
    params.action.confidence === "baixa"
      ? null
      : params.action.headline.trim();

  const draft: ExecutiveInsightsSummary = {
    overallState,
    mainDeviation,
    mainRisk: params.mainRisk,
    mainOpportunity: params.mainOpportunity,
    nextAction,
    narrative: "",
  };
  draft.narrative = buildExecutiveInsightsNarrative(draft);
  return draft;
}

/**
 * Compõe o pacote de insights executivos a partir dos motores já existentes.
 */
export function composeExecutiveInsights(
  input: ComposeExecutiveInsightsInput,
): ExecutiveInsightsPack {
  const periodLabel = input.periodLabel ?? null;
  const confidence = input.confidence;
  const confidenceReason = pickConfidenceReason(input.confidenceReason, [
    input.predictions.summary.explanation,
    input.action.reason,
  ]);

  const raw = [
    ...mapBusinessToInsights(
      input.business,
      confidence,
      confidenceReason,
      periodLabel,
    ),
    ...mapIntelligenceToInsights(
      input.intelligence,
      confidence,
      confidenceReason,
      periodLabel,
    ),
    ...mapPredictionToInsights(
      input.predictions,
      confidence,
      confidenceReason,
      periodLabel,
    ),
    mapActionCenterToInsight(input.action, periodLabel),
  ].map((item) => ({
    ...item,
    referenceDate: input.referenceDate ?? item.referenceDate,
  }));

  const deduped = dedupeInsights(raw);
  const ranked = rankInsights(deduped);
  const parts = partitionTopInsights(ranked);

  const summary = composeSummary({
    business: input.business,
    action: input.action,
    mainRisk: parts.risks[0]?.title ?? null,
    mainOpportunity: parts.opportunities[0]?.title ?? null,
  });

  return {
    summary,
    primary: parts.primary,
    risks: parts.risks,
    opportunities: parts.opportunities,
    positives: parts.positives,
    informational: parts.informational,
    more: parts.more,
    all: ranked,
    periodLabel,
    confidence: mergeConfidence([
      confidence,
      input.action.confidence,
      input.predictions.summary.confidence,
    ]),
    confidenceReason,
  };
}
