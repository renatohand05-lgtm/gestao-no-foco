/**
 * Executive Decision Center Engine — Gate 20.6
 * Fila de decisões a partir de AI · BH · Predictive · Timeline · sem fetch · sem LLM.
 */

import type {
  ExecutiveAiDiagnostic,
  ExecutiveAiInput,
  ExecutiveAiModule,
  ExecutiveAiRecommendation,
  ExecutiveAiResult,
} from "../ai/executive-ai-types.ts";
import {
  runBusinessHealthEngine,
  type BusinessHealthResult,
} from "../dashboard/business-health-engine.ts";
import type { ExecutiveDecisionResult } from "../dashboard/executive-decision-types.ts";
import {
  runExecutiveTimeline,
  type ExecutiveTimelineEvent,
  type ExecutiveTimelineResult,
} from "../executive-timeline/index.ts";
import type { PredictiveIntelligenceResult } from "../predictive/types.ts";
import {
  clamp01to100,
  computeConfidence,
  computeEffort,
  computeImpact,
  computeUrgency,
  isQuickWin,
  priorityFromScores,
} from "./impact-engine.ts";
import {
  computeDecisionQueueScore,
  dedupeDecisions,
  sortDecisionQueue,
} from "./priority-engine.ts";
import {
  computeExecutiveDecisionScore,
} from "./score-engine.ts";
import { buildDecisionSimulations } from "./simulation-engine.ts";
import {
  EDC_ENGINE_VERSION,
  EDC_MAX_DECISIONS,
  EDC_MAX_QUICK_WINS,
  type EdcCategory,
  type EdcDecision,
  type EdcPriority,
  type EdcResult,
} from "./types.ts";

export type RunExecutiveDecisionCenterInput = {
  tenantSlug: string;
  ai: ExecutiveAiResult;
  predictive: PredictiveIntelligenceResult;
  /** Feeds do mesmo ciclo do snapshot (simulações · sem fetch). */
  feeds?: ExecutiveAiInput | null;
  decision?: ExecutiveDecisionResult | null;
  businessHealth?: BusinessHealthResult;
  timeline?: ExecutiveTimelineResult;
};

function moduleToCategory(module: ExecutiveAiModule | string | null): EdcCategory {
  switch (module) {
    case "financeiro":
      return "finance";
    case "comercial":
      return "sales";
    case "operacao":
      return "operations";
    case "estoque":
      return "inventory";
    case "crm":
      return "operations";
    default:
      return "decision";
  }
}

function timelineCategoryToEdc(
  cat: ExecutiveTimelineEvent["category"],
): EdcCategory {
  if (cat === "performance") return "operations";
  return cat;
}

function severityToPriorityHint(
  severity: ExecutiveAiDiagnostic["severity"],
): EdcPriority | null {
  if (severity === "critica") return "critical";
  if (severity === "alta") return "high";
  if (severity === "media") return "medium";
  if (severity === "baixa" || severity === "oportunidade") return "low";
  return null;
}

function finalizeDecision(
  partial: Omit<EdcDecision, "score" | "priority" | "quickWin"> & {
    priorityHint?: EdcPriority | null;
    complexity?: "baixa" | "media" | "alta";
    riskCritical?: boolean;
    cashNegative?: boolean;
  },
): EdcDecision {
  const urgency = computeUrgency({
    priorityHint: partial.priorityHint ?? null,
    riskCritical: partial.riskCritical ?? false,
    cashNegative: partial.cashNegative ?? false,
  });
  const priority = priorityFromScores({
    impact: partial.impact,
    urgency,
    confidence: partial.confidence,
  });
  const effort = partial.effort;
  const score = computeDecisionQueueScore({
    priority,
    impact: partial.impact,
    urgency,
    confidence: partial.confidence,
    effort,
  });
  const quickWin = isQuickWin({
    effort,
    impact: partial.impact,
    confidence: partial.confidence,
  });

  return {
    id: partial.id,
    title: partial.title,
    description: partial.description,
    category: partial.category,
    priority,
    impact: partial.impact,
    urgency,
    confidence: partial.confidence,
    effort,
    score,
    recommendation: partial.recommendation,
    evidence: partial.evidence,
    source: partial.source,
    suggestedAction: partial.suggestedAction,
    financialImpactLabel: partial.financialImpactLabel,
    timestamp: partial.timestamp,
    href: partial.href,
    quickWin,
  };
}

function fromRecommendation(
  r: ExecutiveAiRecommendation,
  ai: ExecutiveAiResult,
): EdcDecision {
  const evidence = [
    {
      id: `${r.id}:reason`,
      label: "Motivo",
      value: r.reason,
      source: r.source,
    },
    ...(r.expectedImpact
      ? [
          {
            id: `${r.id}:impact`,
            label: "Impacto esperado",
            value: r.expectedImpact,
            source: r.source,
          },
        ]
      : []),
  ];
  const impact = computeImpact({
    severityBoost: clamp01to100(100 - (r.priority - 1) * 14),
    scoreGap: null,
    hasFinancialSignal: Boolean(r.expectedImpact),
  });
  const confidence = computeConfidence({
    partial: ai.partial,
    evidenceCount: evidence.length,
    sourceReliable: true,
  });
  const effort = computeEffort({
    category: r.module,
    hasHref: Boolean(r.href),
    complexity: r.priority <= 2 ? "media" : "baixa",
  });

  return finalizeDecision({
    id: `edc:rec:${r.id}`,
    title: r.title || r.action,
    description: r.reason,
    category: "recommendation",
    impact,
    urgency: "media",
    confidence,
    effort,
    recommendation: r.action || r.title,
    evidence,
    source: r.source || "decision-engine",
    suggestedAction: r.action || r.title,
    financialImpactLabel: r.expectedImpact ?? null,
    timestamp: ai.generatedAt,
    href: r.href,
    priorityHint:
      r.priority <= 1 ? "critical" : r.priority <= 2 ? "high" : "medium",
    complexity: r.priority <= 2 ? "media" : "baixa",
  });
}

function fromDiagnostic(
  d: ExecutiveAiDiagnostic,
  ai: ExecutiveAiResult,
): EdcDecision {
  const evidence = d.evidence.slice(0, 4).map((text, idx) => ({
    id: `${d.id}:ev:${idx}`,
    label: "Evidência",
    value: text,
    source: d.source,
  }));
  const impact = computeImpact({
    severityBoost:
      d.severity === "critica"
        ? 90
        : d.severity === "alta"
          ? 75
          : d.severity === "media"
            ? 55
            : d.severity === "oportunidade"
              ? 60
              : 35,
    scoreGap: Math.abs(d.scoreImpact) * 4,
    hasFinancialSignal: /R\$|valor|caixa|pagar|receber/i.test(
      d.evidence.join(" "),
    ),
  });
  const confidence = computeConfidence({
    partial: ai.partial,
    evidenceCount: evidence.length,
    sourceReliable: true,
  });
  const effort = computeEffort({
    category: d.module,
    hasHref: Boolean(d.href),
    complexity:
      d.severity === "critica" || d.severity === "alta" ? "media" : "baixa",
  });

  return finalizeDecision({
    id: `edc:diag:${d.id}`,
    title: d.title,
    description: d.description,
    category: d.severity === "oportunidade" ? "sales" : "risk",
    impact,
    urgency: "media",
    confidence,
    effort,
    recommendation: d.title,
    evidence,
    source: d.source || "decision-engine",
    suggestedAction: d.href
      ? "Abrir módulo relacionado e agir sobre a evidência."
      : "Revisar evidências e definir ação operacional.",
    financialImpactLabel: null,
    timestamp: ai.generatedAt,
    href: d.href,
    priorityHint: severityToPriorityHint(d.severity),
    riskCritical: d.severity === "critica",
    complexity:
      d.severity === "critica" || d.severity === "alta" ? "media" : "baixa",
  });
}

function fromTimelineEvent(e: ExecutiveTimelineEvent): EdcDecision {
  const impact = computeImpact({
    severityBoost: e.impact,
    scoreGap: null,
    hasFinancialSignal: e.evidence.some((ev) =>
      /R\$|caixa|pagar|receber|fatur/i.test(`${ev.label} ${ev.value}`),
    ),
  });
  const confidence = e.confidence;
  const effort = computeEffort({
    category: e.category,
    hasHref: Boolean(e.href),
    complexity:
      e.severity === "critical"
        ? "media"
        : e.severity === "positive"
          ? "baixa"
          : "media",
  });
  const priorityHint: EdcPriority | null =
    e.severity === "critical"
      ? "critical"
      : e.severity === "attention"
        ? "high"
        : e.severity === "positive"
          ? "medium"
          : "low";

  return finalizeDecision({
    id: `edc:tl:${e.id}`,
    title: e.title,
    description: e.description,
    category: timelineCategoryToEdc(e.category),
    impact,
    urgency: "media",
    confidence,
    effort,
    recommendation: e.recommendation ?? e.title,
    evidence: e.evidence.map((ev) => ({
      id: ev.id,
      label: ev.label,
      value: ev.value,
      source: ev.source,
    })),
    source: e.source,
    suggestedAction:
      e.recommendation ??
      (e.href ? "Abrir módulo relacionado." : "Avaliar evidências na timeline."),
    financialImpactLabel: null,
    timestamp: e.timestamp,
    href: e.href,
    priorityHint,
    riskCritical: e.severity === "critical",
    complexity: e.severity === "positive" ? "baixa" : "media",
  });
}

function fromPredictive(predictive: PredictiveIntelligenceResult): EdcDecision[] {
  const out: EdcDecision[] = [];
  for (const f of predictive.forecasts) {
    if (f.unavailableReason && f.evidence.length === 0) continue;
    if (f.risk === "baixo" || f.risk === "indisponivel") continue;

    const impact = computeImpact({
      severityBoost:
        f.risk === "critico" ? 88 : f.risk === "alto" ? 72 : 55,
      scoreGap: null,
      hasFinancialSignal: f.domain === "faturamento" || f.domain === "fluxo_caixa",
    });
    const confidence = f.confidence;
    const effort = computeEffort({
      category: f.domain,
      hasHref: Boolean(f.href),
      complexity: f.risk === "critico" ? "alta" : "media",
    });

    out.push(
      finalizeDecision({
        id: `edc:pred:${f.domain}`,
        title: `Previsão · ${f.title}`,
        description: f.headline,
        category: "forecast",
        impact,
        urgency: "media",
        confidence,
        effort,
        recommendation: f.headline,
        evidence: f.evidence.slice(0, 4).map((ev) => ({
          id: ev.id,
          label: ev.label,
          value: ev.value,
          source: ev.source,
        })),
        source: "predictive-intelligence",
        suggestedAction: f.href
          ? "Revisar previsão e abrir módulo indicado."
          : "Monitorar previsão e preparar contingência.",
        financialImpactLabel:
          f.primaryValue !== "Indisponível" ? f.primaryValue : null,
        timestamp: predictive.generatedAt,
        href: f.href,
        priorityHint:
          f.risk === "critico"
            ? "critical"
            : f.risk === "alto"
              ? "high"
              : "medium",
        riskCritical: f.risk === "critico",
        complexity: f.risk === "critico" ? "alta" : "media",
      }),
    );
  }
  return out;
}

function fromBusinessHealth(bh: BusinessHealthResult): EdcDecision[] {
  return bh.priorities.slice(0, 5).map((p) => {
    const impact = computeImpact({
      severityBoost: clamp01to100(95 - (p.rank - 1) * 12),
      scoreGap: bh.overallScore == null ? null : 100 - bh.overallScore,
      hasFinancialSignal: p.module === "financeiro",
    });
    const confidence = computeConfidence({
      partial: bh.confidence === "baixa",
      evidenceCount: 1,
      sourceReliable: bh.confidence !== "baixa",
    });
    const effort = computeEffort({
      category: p.module ?? "geral",
      hasHref: Boolean(p.href),
      complexity: p.rank <= 2 ? "media" : "baixa",
    });

    return finalizeDecision({
      id: `edc:bh:${p.id}`,
      title: p.title,
      description: p.reason,
      category: moduleToCategory(p.module),
      impact,
      urgency: "media",
      confidence,
      effort,
      recommendation: p.title,
      evidence: [
        {
          id: `${p.id}:reason`,
          label: "Prioridade BH",
          value: p.reason,
          source: "business-health-engine",
        },
      ],
      source: "business-health-engine",
      suggestedAction: p.href
        ? "Abrir módulo da prioridade de saúde."
        : "Executar a prioridade do Business Health.",
      financialImpactLabel: null,
      timestamp: bh.generatedAt,
      href: p.href,
      priorityHint: p.rank <= 1 ? "critical" : p.rank <= 2 ? "high" : "medium",
      complexity: p.rank <= 2 ? "media" : "baixa",
    });
  });
}

function fromLegacyDecision(
  decision: ExecutiveDecisionResult,
): EdcDecision[] {
  return decision.items.slice(0, 8).map((item) => {
    const impact = computeImpact({
      severityBoost:
        item.severity === "critical"
          ? 90
          : item.severity === "warning"
            ? 70
            : item.severity === "opportunity"
              ? 60
              : 40,
      scoreGap: null,
      hasFinancialSignal: item.impactValue != null,
    });
    const confidence = computeConfidence({
      partial: false,
      evidenceCount: 1,
      sourceReliable: true,
    });
    const effort = computeEffort({
      category: item.category,
      hasHref: Boolean(item.href),
      complexity: item.severity === "critical" ? "media" : "baixa",
    });

    return finalizeDecision({
      id: `edc:dec:${item.id}`,
      title: item.title,
      description: item.description,
      category: "decision",
      impact,
      urgency: "media",
      confidence,
      effort,
      recommendation: item.actionLabel ?? item.title,
      evidence: [
        {
          id: `${item.id}:src`,
          label: "Fonte",
          value: item.source,
          source: item.source,
        },
      ],
      source: item.source || "decision-center",
      suggestedAction: item.actionLabel ?? "Avaliar decisão no centro legado.",
      financialImpactLabel:
        item.impactValue != null
          ? new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 0,
            }).format(item.impactValue)
          : null,
      timestamp: decision.updatedAt,
      href: item.href,
      priorityHint:
        item.severity === "critical"
          ? "critical"
          : item.severity === "warning"
            ? "high"
            : "medium",
      riskCritical: item.severity === "critical",
      complexity: item.severity === "opportunity" ? "baixa" : "media",
    });
  });
}

/**
 * Monta a fila executiva, score e simulações a partir de engines existentes.
 */
export function runExecutiveDecisionCenter(
  input: RunExecutiveDecisionCenterInput,
): EdcResult {
  const bh =
    input.businessHealth ?? runBusinessHealthEngine(input.ai);
  const timeline =
    input.timeline ??
    runExecutiveTimeline({
      tenantSlug: input.tenantSlug,
      ai: input.ai,
      predictive: input.predictive,
      decision: input.decision ?? null,
      businessHealth: bh,
    });

  const raw: EdcDecision[] = [
    ...input.ai.recommendations.map((r) => fromRecommendation(r, input.ai)),
    ...input.ai.diagnostics.map((d) => fromDiagnostic(d, input.ai)),
    ...fromPredictive(input.predictive),
    ...fromBusinessHealth(bh),
    ...timeline.events.slice(0, 12).map(fromTimelineEvent),
    ...(input.decision ? fromLegacyDecision(input.decision) : []),
  ];

  const deduped = dedupeDecisions(raw);
  const queue = sortDecisionQueue(deduped).slice(0, EDC_MAX_DECISIONS);
  const quickWins = queue
    .filter((d) => d.quickWin)
    .slice(0, EDC_MAX_QUICK_WINS);

  const executiveScore = computeExecutiveDecisionScore({
    bh,
    predictive: input.predictive,
  });

  const emptyFeeds: ExecutiveAiInput = {
    tenantSlug: input.tenantSlug,
    financeiro: null,
    comercial: null,
    crm: null,
    operacao: null,
    estoque: null,
  };

  const simulations = buildDecisionSimulations({
    feeds: input.feeds ?? emptyFeeds,
    predictive: input.predictive,
  });

  return {
    decisions: queue,
    queue,
    quickWins,
    executiveScore,
    simulations,
    total: queue.length,
    generatedAt: input.ai.generatedAt || new Date().toISOString(),
    engineVersion: EDC_ENGINE_VERSION,
    tenantSlug: input.tenantSlug,
  };
}

export const ExecutiveDecisionCenterEngine = {
  version: EDC_ENGINE_VERSION,
  run: runExecutiveDecisionCenter,
} as const;
