/**
 * Action Center Engine (Sprint 11.4)
 *
 * Consome exclusivamente ExecutiveIntelligenceResult.
 * Não recalcula indicadores — só organiza a decisão executiva.
 */

import type { ExecutiveIntelligenceResult } from "@/lib/intelligence/types";
import type {
  ActionCenterConfidence,
  ActionCenterDecision,
  ActionCenterPriority,
} from "@/lib/action-center/types";

function mapPriority(
  intelligence: ExecutiveIntelligenceResult,
): ActionCenterPriority {
  const { action, score, health } = intelligence;

  if (action.severity === "critical") return "CRITICA";

  if (
    action.severity === "important" &&
    (score.status === "critico" || health.status === "critica")
  ) {
    return "CRITICA";
  }

  if (action.severity === "important") return "ALTA";
  if (action.severity === "positive") return "BAIXA";
  return "MEDIA";
}

function mapConfidence(
  intelligence: ExecutiveIntelligenceResult,
): ActionCenterConfidence {
  if (
    intelligence.score.status === "dados_insuficientes" ||
    intelligence.timeline.elapsedBusinessDays < 3
  ) {
    return "baixa";
  }
  if (
    intelligence.timeline.elapsedBusinessDays < 10 ||
    intelligence.score.status === "atencao" ||
    intelligence.health.status === "atencao"
  ) {
    return "media";
  }
  return "alta";
}

function resolveImpact(intelligence: ExecutiveIntelligenceResult): string {
  const criticalInsight = intelligence.insights.find(
    (i) => i.category === "critical" || i.category === "important",
  );
  if (criticalInsight?.impact) return criticalInsight.impact;
  if (intelligence.diagnosis.conclusion) {
    return intelligence.diagnosis.conclusion;
  }
  return intelligence.action.rationale;
}

function resolveDeadline(intelligence: ExecutiveIntelligenceResult): string {
  const remaining = intelligence.timeline.remainingBusinessDays;
  if (remaining <= 0) {
    return "Prazo: competência sem dias úteis restantes — agir no calendário atual ou revisar fechamento.";
  }
  if (remaining === 1) {
    return "Prazo sugerido: próximo 1 dia útil.";
  }
  return `Prazo sugerido: próximos ${remaining} dias úteis.`;
}

function resolveDescription(
  intelligence: ExecutiveIntelligenceResult,
): string {
  const parts = [
    intelligence.diagnosis.summary,
    intelligence.action.description,
  ].filter((p) => p && p.trim().length > 0);

  // Evita repetir o mesmo texto duas vezes
  const unique = parts.filter(
    (p, i, arr) =>
      arr.findIndex((x) => x.toLowerCase() === p.toLowerCase()) === i,
  );
  return unique.join(" ");
}

/**
 * Uma única decisão executiva a partir da inteligência já calculada.
 */
export function buildActionCenterDecision(
  intelligence: ExecutiveIntelligenceResult,
): ActionCenterDecision {
  const { action } = intelligence;

  return {
    priority: mapPriority(intelligence),
    headline: action.title,
    description: resolveDescription(intelligence),
    impact: resolveImpact(intelligence),
    deadline: resolveDeadline(intelligence),
    cta: {
      label: "Ver detalhes",
      href: action.href,
    },
    reason: action.rationale,
    confidence: mapConfidence(intelligence),
  };
}
