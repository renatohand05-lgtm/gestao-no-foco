/**
 * Mappers — convertem saídas existentes em insights compostos.
 * Sem recálculo financeiro.
 */

import type { ActionCenterDecision } from "@/lib/action-center/types";
import type { BusinessIntelligenceResult } from "@/lib/business-intelligence/types";
import type { ExecutiveIntelligenceResult } from "@/lib/intelligence/types";
import type { PredictionEngineResult } from "@/lib/predictions/types";
import {
  forceInformativeWhenLow,
  mergeConfidence,
  pickConfidenceReason,
} from "@/lib/executive-insights/executive-insight-confidence";
import {
  priorityScore,
  severityFromType,
  typeFromActionPriority,
  typeFromBusinessSeverity,
  typeFromEiCategory,
} from "@/lib/executive-insights/executive-insight-priority";
import {
  resolveCategoryForTheme,
  resolveThemeKey,
} from "@/lib/executive-insights/executive-insight-rules";
import type {
  ExecutiveComposedInsight,
  ExecutiveInsightConfidence,
  ExecutiveInsightSource,
} from "@/lib/executive-insights/executive-insight-types";

function baseInsight(input: {
  id: string;
  title: string;
  summary: string;
  evidence?: string | null;
  impact?: string | null;
  recommendation?: string | null;
  cta?: { label: string; href: string } | null;
  type: ExecutiveComposedInsight["type"];
  confidence: ExecutiveInsightConfidence;
  confidenceReason: string;
  sources: ExecutiveInsightSource[];
  ruleId: string;
  periodLabel?: string | null;
  relatedMetrics?: ExecutiveComposedInsight["relatedMetrics"];
  horizon?: string | null;
  status?: ExecutiveComposedInsight["status"];
  referenceDate?: string | null;
}): ExecutiveComposedInsight {
  const themeKey = resolveThemeKey(input.title, input.summary);
  let type = forceInformativeWhenLow(input.confidence, input.type);
  if (
    input.confidence === "baixa" &&
    (type === "critical" || type === "warning")
  ) {
    type = "informational";
  }
  const severity = severityFromType(type);
  const priority = priorityScore({
    type,
    severity,
    confidence: input.confidence,
    actionable: Boolean(input.cta?.href),
  });

  return {
    id: input.id,
    type,
    category: resolveCategoryForTheme(themeKey),
    priority,
    severity,
    title: input.title,
    summary: input.summary,
    evidence: input.evidence ?? null,
    impact: input.impact ?? null,
    recommendation: input.recommendation ?? null,
    cta: input.cta ?? null,
    confidence: input.confidence,
    confidenceReason: input.confidenceReason,
    sources: input.sources,
    ruleId: input.ruleId,
    periodLabel: input.periodLabel ?? null,
    relatedMetrics: input.relatedMetrics ?? [],
    horizon: input.horizon ?? null,
    status: input.status ?? "active",
    referenceDate: input.referenceDate ?? null,
    themeKey,
  };
}

export function mapBusinessToInsights(
  business: BusinessIntelligenceResult,
  confidence: ExecutiveInsightConfidence,
  confidenceReason: string,
  periodLabel: string | null,
): ExecutiveComposedInsight[] {
  const items: ExecutiveComposedInsight[] = [];

  items.push(
    baseInsight({
      id: "bi-summary",
      title: business.summary.headline,
      summary: business.summary.executiveSummary,
      evidence: business.cause.description,
      impact: business.cause.supportingMetrics
        .map((m) => `${m.label}: ${m.value}`)
        .join(" · ") || null,
      type:
        business.summary.status === "critico"
          ? "critical"
          : business.summary.status === "atencao" ||
              business.summary.status === "recuperacao"
            ? "warning"
            : business.summary.status === "excelente" ||
                business.summary.status === "no_ritmo"
              ? "positive"
              : "informational",
      confidence: mergeConfidence([confidence, business.cause.confidence]),
      confidenceReason: pickConfidenceReason(confidenceReason, [
        business.cause.title,
      ]),
      sources: ["business_intelligence"],
      ruleId: "map.bi.summary",
      periodLabel,
      relatedMetrics: business.cause.supportingMetrics,
      status:
        business.summary.status === "dados_insuficientes"
          ? "insufficient_data"
          : "active",
    }),
  );

  for (const risk of business.risks) {
    items.push(
      baseInsight({
        id: `bi-risk-${risk.id}`,
        title: risk.title,
        summary: risk.description,
        evidence: risk.description,
        impact: risk.impact,
        type: typeFromBusinessSeverity(risk.severity),
        confidence,
        confidenceReason,
        sources: ["business_intelligence"],
        ruleId: "map.bi.risk",
        periodLabel,
      }),
    );
  }

  for (const opp of business.opportunities) {
    items.push(
      baseInsight({
        id: `bi-opp-${opp.id}`,
        title: opp.title,
        summary: opp.description,
        evidence: opp.description,
        impact: opp.estimatedImpact,
        type: "opportunity",
        confidence,
        confidenceReason,
        sources: ["business_intelligence"],
        ruleId: "map.bi.opportunity",
        periodLabel,
      }),
    );
  }

  return items;
}

export function mapIntelligenceToInsights(
  intelligence: ExecutiveIntelligenceResult,
  confidence: ExecutiveInsightConfidence,
  confidenceReason: string,
  periodLabel: string | null,
): ExecutiveComposedInsight[] {
  const items: ExecutiveComposedInsight[] = [];

  for (const insight of intelligence.insights) {
    items.push(
      baseInsight({
        id: `ei-${insight.id}`,
        title: insight.title,
        summary: insight.description,
        evidence: insight.description,
        impact: insight.impact,
        recommendation: insight.recommendation,
        cta:
          insight.href && insight.actionLabel
            ? { label: insight.actionLabel, href: insight.href }
            : null,
        type: typeFromEiCategory(insight.category),
        confidence,
        confidenceReason,
        sources: ["executive_intelligence"],
        ruleId: "map.ei.insight",
        periodLabel,
      }),
    );
  }

  items.push(
    baseInsight({
      id: "ei-health",
      title: "Saúde operacional do período",
      summary: intelligence.health.reason,
      evidence: intelligence.health.supportingMetrics
        .map((m) => `${m.label}: ${m.value}`)
        .join(" · ") || intelligence.health.reason,
      impact: intelligence.score.explanation,
      type:
        intelligence.health.status === "critica"
          ? "critical"
          : intelligence.health.status === "atencao"
            ? "warning"
            : intelligence.health.status === "excelente" ||
                intelligence.health.status === "saudavel"
              ? "positive"
              : "informational",
      confidence,
      confidenceReason,
      sources: ["executive_intelligence"],
      ruleId: "map.ei.health",
      periodLabel,
      relatedMetrics: intelligence.health.supportingMetrics,
    }),
  );

  return items;
}

export function mapPredictionToInsights(
  predictions: PredictionEngineResult,
  confidence: ExecutiveInsightConfidence,
  confidenceReason: string,
  periodLabel: string | null,
): ExecutiveComposedInsight[] {
  const items: ExecutiveComposedInsight[] = [];
  const summary = predictions.summary;

  items.push(
    baseInsight({
      id: "pred-summary",
      title: summary.headline,
      summary: summary.explanation,
      evidence: summary.explanation,
      impact: predictions.recommendation?.expectedImpact ?? null,
      recommendation: predictions.recommendation?.title ?? null,
      type:
        summary.status === "critico"
          ? "critical"
          : summary.status === "atencao" || summary.status === "recuperacao"
            ? "warning"
            : summary.status === "meta_atingida" ||
                summary.status === "meta_superada" ||
                summary.status === "no_ritmo"
              ? "positive"
              : "informational",
      confidence: mergeConfidence([confidence, summary.confidence]),
      confidenceReason: pickConfidenceReason(confidenceReason, [
        predictions.recommendation?.rationale,
        predictions.recommendation?.confidenceWarning,
      ]),
      sources: ["prediction"],
      ruleId: "map.prediction.summary",
      periodLabel,
      status:
        summary.status === "dados_insuficientes"
          ? "insufficient_data"
          : "active",
      horizon: null,
    }),
  );

  return items;
}

export function mapActionCenterToInsight(
  action: ActionCenterDecision,
  periodLabel: string | null,
): ExecutiveComposedInsight {
  return baseInsight({
    id: "action-center-primary",
    title: action.headline,
    summary: action.description,
    evidence: action.reason,
    impact: action.impact,
    recommendation: action.description,
    cta: action.cta,
    type: typeFromActionPriority(action.priority),
    confidence: action.confidence,
    confidenceReason: action.reason,
    sources: ["action_center"],
    ruleId: "map.action_center",
    periodLabel,
    horizon: action.deadline || null,
  });
}
