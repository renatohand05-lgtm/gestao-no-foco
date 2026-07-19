/**
 * TimelineEngine (Sprint 11.5)
 * Transforma EI + BI + Predictions em narrativa — zero recálculo.
 */

import type { BusinessIntelligenceResult } from "@/lib/business-intelligence";
import type { ExecutiveIntelligenceResult } from "@/lib/intelligence/types";
import type { PredictionEngineResult } from "@/lib/predictions";
import {
  TIMELINE_MAX_VISIBLE,
  type TimelineCategory,
  type TimelineConfidence,
  type TimelineEngineResult,
  type TimelineEvent,
  type TimelinePriority,
  type TimelineTone,
} from "@/lib/timeline-engine/types";

type BuildInput = {
  intelligence: ExecutiveIntelligenceResult;
  business: BusinessIntelligenceResult;
  predictions: PredictionEngineResult;
};

const PRIORITY_ORDER: Record<TimelinePriority, number> = {
  CRITICA: 0,
  ALTA: 1,
  MEDIA: 2,
  BAIXA: 3,
};

function toneFromExecutive(
  tone: "success" | "warning" | "danger" | "info" | "neutral",
): TimelineTone {
  if (tone === "success") return "Success";
  if (tone === "warning") return "Warning";
  if (tone === "danger") return "Danger";
  return "Info";
}

function inferCategory(text: string): TimelineCategory {
  const t = text.toLowerCase();
  if (t.includes("ticket")) return "Ticket";
  if (t.includes("ritmo")) return "Ritmo";
  if (t.includes("proje") || t.includes("fechamento")) return "Projeção";
  if (t.includes("crescimento") || t.includes("crescente")) return "Crescimento";
  if (t.includes("confiança") || t.includes("confianca") || t.includes("amostra"))
    return "Confiança";
  if (t.includes("tendência") || t.includes("tendencia")) return "Tendência";
  if (t.includes("meta") || t.includes("atingimento") || t.includes("gap"))
    return "Meta";
  return "Performance";
}

function priorityFromSeverity(
  severity: "critical" | "important" | "positive" | "neutral",
): TimelinePriority {
  if (severity === "critical") return "CRITICA";
  if (severity === "important") return "ALTA";
  if (severity === "positive") return "BAIXA";
  return "MEDIA";
}

function priorityFromInsightCategory(
  category: "critical" | "important" | "positive" | "informative",
): TimelinePriority {
  if (category === "critical") return "CRITICA";
  if (category === "important") return "ALTA";
  if (category === "positive") return "BAIXA";
  return "MEDIA";
}

function priorityFromRisk(severity: "alta" | "media" | "baixa"): TimelinePriority {
  if (severity === "alta") return "CRITICA";
  if (severity === "media") return "ALTA";
  return "BAIXA";
}

function priorityFromBusinessStatus(
  status: BusinessIntelligenceResult["summary"]["status"],
): TimelinePriority {
  if (status === "critico") return "CRITICA";
  if (status === "atencao" || status === "dados_insuficientes") return "ALTA";
  if (status === "recuperacao") return "MEDIA";
  if (status === "excelente" || status === "no_ritmo") return "BAIXA";
  return "MEDIA";
}

function impactScoreFromPriority(p: TimelinePriority): number {
  if (p === "CRITICA") return 90;
  if (p === "ALTA") return 70;
  if (p === "MEDIA") return 45;
  return 25;
}

function sortEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (p !== 0) return p;
    const r = a.recencyRank - b.recencyRank;
    if (r !== 0) return r;
    return b.impactScore - a.impactScore;
  });
}

function pushEvent(
  bag: TimelineEvent[],
  event: Omit<TimelineEvent, "impactScore"> & { impactScore?: number },
) {
  const impactScore =
    event.impactScore ?? impactScoreFromPriority(event.priority);
  bag.push({ ...event, impactScore });
}

/**
 * Narrativa cronológica a partir dos resultados já calculados.
 */
export function buildExecutiveTimelineEvents(
  input: BuildInput,
): TimelineEngineResult {
  const { intelligence, business, predictions } = input;
  const events: TimelineEvent[] = [];
  let recency = 0;

  // — Executive Intelligence —
  pushEvent(events, {
    id: "ei-action",
    priority: priorityFromSeverity(intelligence.action.severity),
    category: inferCategory(
      `${intelligence.action.title} ${intelligence.action.rationale}`,
    ),
    tone:
      intelligence.action.severity === "critical"
        ? "Danger"
        : intelligence.action.severity === "important"
          ? "Warning"
          : intelligence.action.severity === "positive"
            ? "Success"
            : "Info",
    title: intelligence.action.title,
    description: intelligence.action.description,
    impact: intelligence.action.rationale,
    confidence: mapScoreConfidence(intelligence),
    origin: "executive_intelligence",
    timestamp: null,
    recencyRank: recency++,
  });

  pushEvent(events, {
    id: "ei-score",
    priority:
      intelligence.score.status === "critico"
        ? "CRITICA"
        : intelligence.score.status === "atencao" ||
            intelligence.score.status === "dados_insuficientes"
          ? "ALTA"
          : intelligence.score.status === "excelente"
            ? "BAIXA"
            : "MEDIA",
    category: "Performance",
    tone: toneFromExecutive(intelligence.score.tone),
    title: "Score executivo",
    description: intelligence.score.explanation,
    impact:
      intelligence.score.score === null
        ? "Score indisponível neste contexto."
        : `Score ${intelligence.score.score}/100 (${intelligence.score.status}).`,
    confidence: mapScoreConfidence(intelligence),
    origin: "executive_intelligence",
    timestamp: null,
    recencyRank: recency++,
  });

  pushEvent(events, {
    id: "ei-health",
    priority:
      intelligence.health.status === "critica"
        ? "CRITICA"
        : intelligence.health.status === "atencao"
          ? "ALTA"
          : intelligence.health.status === "excelente"
            ? "BAIXA"
            : "MEDIA",
    category: "Performance",
    tone: toneFromExecutive(intelligence.health.tone),
    title: "Saúde comercial",
    description: intelligence.health.reason,
    impact:
      intelligence.health.percentage === null
        ? intelligence.health.reason
        : `Saúde em ${intelligence.health.percentage}%.`,
    confidence: mapScoreConfidence(intelligence),
    origin: "executive_intelligence",
    timestamp: null,
    recencyRank: recency++,
  });

  pushEvent(events, {
    id: "ei-diagnosis",
    priority:
      intelligence.action.severity === "critical" ? "CRITICA" : "ALTA",
    category: inferCategory(intelligence.diagnosis.primaryCause),
    tone: toneFromExecutive(intelligence.score.tone),
    title: "Diagnóstico",
    description: intelligence.diagnosis.summary,
    impact: intelligence.diagnosis.conclusion,
    confidence: mapScoreConfidence(intelligence),
    origin: "executive_intelligence",
    timestamp: null,
    recencyRank: recency++,
  });

  for (const insight of intelligence.insights) {
    pushEvent(events, {
      id: `ei-insight-${insight.id}`,
      priority: priorityFromInsightCategory(insight.category),
      category: inferCategory(
        `${insight.title} ${insight.description} ${insight.recommendation}`,
      ),
      tone:
        insight.category === "critical"
          ? "Danger"
          : insight.category === "important"
            ? "Warning"
            : insight.category === "positive"
              ? "Success"
              : "Info",
      title: insight.title,
      description: insight.description,
      impact: insight.impact,
      confidence: mapScoreConfidence(intelligence),
      origin: "executive_intelligence",
      timestamp: null,
      impactScore: Math.max(
        0,
        100 - insight.priority * 12,
      ),
      recencyRank: recency++,
    });
  }

  // Marcos da timeline EI (quando existirem) — usam posição como “timestamp” relativo
  for (const m of intelligence.timeline.milestones) {
    pushEvent(events, {
      id: `ei-milestone-${m.id}`,
      priority: m.status === "current" ? "MEDIA" : "BAIXA",
      category: inferCategory(m.label),
      tone:
        m.status === "done"
          ? "Success"
          : m.status === "current"
            ? "Info"
            : "Info",
      title: m.label,
      description: `Marco do mês · status ${m.status}.`,
      impact: m.value,
      confidence: mapScoreConfidence(intelligence),
      origin: "executive_intelligence",
      timestamp: `posição ${Math.round(m.positionPercent)}% do mês útil`,
      impactScore: 20,
      recencyRank: recency++,
    });
  }

  // — Business Intelligence —
  pushEvent(events, {
    id: "bi-summary",
    priority: priorityFromBusinessStatus(business.summary.status),
    category: inferCategory(
      `${business.summary.headline} ${business.summary.executiveSummary}`,
    ),
    tone: toneFromExecutive(business.summary.tone),
    title: business.summary.headline,
    description: business.summary.executiveSummary,
    impact: `Status: ${business.summary.status.replaceAll("_", " ")}.`,
    confidence: business.cause.confidence,
    origin: "business_intelligence",
    timestamp: null,
    recencyRank: recency++,
  });

  pushEvent(events, {
    id: "bi-cause",
    priority:
      business.cause.confidence === "baixa"
        ? "ALTA"
        : priorityFromBusinessStatus(business.summary.status),
    category: inferCategory(`${business.cause.title} ${business.cause.description}`),
    tone:
      business.summary.tone === "danger"
        ? "Danger"
        : business.summary.tone === "warning"
          ? "Warning"
          : "Info",
    title: `Causa: ${business.cause.title}`,
    description: business.cause.description,
    impact: business.cause.supportingMetrics
      .slice(0, 2)
      .map((m) => `${m.label}: ${m.value}`)
      .join(" · ") || business.cause.description,
    confidence: business.cause.confidence,
    origin: "business_intelligence",
    timestamp: null,
    recencyRank: recency++,
  });

  for (const risk of business.risks) {
    pushEvent(events, {
      id: `bi-risk-${risk.id}`,
      priority: priorityFromRisk(risk.severity),
      category: inferCategory(`${risk.title} ${risk.description}`),
      tone:
        risk.severity === "alta"
          ? "Danger"
          : risk.severity === "media"
            ? "Warning"
            : "Info",
      title: risk.title,
      description: risk.description,
      impact: risk.impact,
      confidence: business.cause.confidence,
      origin: "business_intelligence",
      timestamp: null,
      recencyRank: recency++,
    });
  }

  for (const opp of business.opportunities.slice(0, 3)) {
    pushEvent(events, {
      id: `bi-opp-${opp.id}`,
      priority: "MEDIA",
      category: inferCategory(`${opp.title} ${opp.description}`),
      tone: "Success",
      title: opp.title,
      description: opp.description,
      impact: opp.estimatedImpact,
      confidence: business.cause.confidence,
      origin: "business_intelligence",
      timestamp: null,
      impactScore: 40,
      recencyRank: recency++,
    });
  }

  // — Prediction Engine —
  pushEvent(events, {
    id: "pred-summary",
    priority:
      predictions.summary.status === "critico"
        ? "CRITICA"
        : predictions.summary.status === "atencao" ||
            predictions.summary.status === "dados_insuficientes"
          ? "ALTA"
          : predictions.summary.status === "meta_atingida" ||
              predictions.summary.status === "meta_superada" ||
              predictions.summary.status === "no_ritmo"
            ? "BAIXA"
            : "MEDIA",
    category: "Projeção",
    tone:
      predictions.summary.status === "critico"
        ? "Danger"
        : predictions.summary.status === "atencao"
          ? "Warning"
          : predictions.summary.status === "meta_atingida" ||
              predictions.summary.status === "meta_superada"
            ? "Success"
            : "Info",
    title: predictions.summary.headline,
    description: predictions.summary.explanation,
    impact:
      predictions.summary.baseProjectedGap === null
        ? `Projeção ${predictions.summary.baseProjectedRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
        : `Gap projetado ${predictions.summary.baseProjectedGap.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    confidence: predictions.summary.confidence,
    origin: "prediction_engine",
    timestamp: null,
    recencyRank: recency++,
  });

  if (predictions.recommendation) {
    const rec = predictions.recommendation;
    pushEvent(events, {
      id: "pred-recommendation",
      priority:
        rec.confidence === "baixa"
          ? "ALTA"
          : rec.risk.toLowerCase().includes("alto")
            ? "ALTA"
            : "MEDIA",
      category: "Projeção",
      tone: rec.confidenceWarning ? "Warning" : "Info",
      title: `Cenário recomendado: ${rec.title}`,
      description: rec.rationale,
      impact: rec.expectedImpact,
      confidence: rec.confidence,
      origin: "prediction_engine",
      timestamp: null,
      recencyRank: recency++,
    });
  }

  if (predictions.requiredForMeta.alert) {
    pushEvent(events, {
      id: "pred-required-meta",
      priority:
        predictions.requiredForMeta.viability === "impossivel"
          ? "CRITICA"
          : predictions.requiredForMeta.viability === "improvavel" ||
              predictions.requiredForMeta.viability === "agressivo"
            ? "ALTA"
            : "MEDIA",
      category: "Meta",
      tone:
        predictions.requiredForMeta.viability === "impossivel"
          ? "Danger"
          : predictions.requiredForMeta.viability === "viavel"
            ? "Success"
            : "Warning",
      title: "Necessário para a meta",
      description: predictions.requiredForMeta.alert,
      impact:
        predictions.requiredForMeta.assumptions[0] ??
        predictions.requiredForMeta.alert,
      confidence: predictions.summary.confidence,
      origin: "prediction_engine",
      timestamp: null,
      recencyRank: recency++,
    });
  }

  const ordered = sortEvents(events);
  const visible = ordered.slice(0, TIMELINE_MAX_VISIBLE);
  const hiddenCount = Math.max(0, ordered.length - TIMELINE_MAX_VISIBLE);

  return {
    events: ordered,
    visible,
    hiddenCount,
    hasHistory: hiddenCount > 0,
  };
}

function mapScoreConfidence(
  intelligence: ExecutiveIntelligenceResult,
): TimelineConfidence {
  if (
    intelligence.score.status === "dados_insuficientes" ||
    intelligence.timeline.elapsedBusinessDays < 3
  ) {
    return "baixa";
  }
  if (
    intelligence.timeline.elapsedBusinessDays < 10 ||
    intelligence.score.status === "atencao"
  ) {
    return "media";
  }
  return "alta";
}
