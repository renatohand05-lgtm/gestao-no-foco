/**
 * Prioridade e score da fila (Gate 20.6).
 */

import type { EdcConfidence, EdcEffort, EdcPriority, EdcUrgency } from "./types.ts";
import { clamp01to100 } from "./impact-engine.ts";

const PRIORITY_WEIGHT: Record<EdcPriority, number> = {
  critical: 40,
  high: 30,
  medium: 18,
  low: 8,
};

const URGENCY_WEIGHT: Record<EdcUrgency, number> = {
  imediata: 25,
  alta: 18,
  media: 10,
  baixa: 4,
};

const CONF_WEIGHT: Record<EdcConfidence, number> = {
  alta: 15,
  media: 10,
  baixa: 5,
};

const EFFORT_BONUS: Record<EdcEffort, number> = {
  baixo: 12,
  medio: 6,
  alto: 0,
};

/**
 * Score de fila 0–100: prioridade + impacto + urgência + confiança + bônus esforço baixo.
 */
export function computeDecisionQueueScore(params: {
  priority: EdcPriority;
  impact: number;
  urgency: EdcUrgency;
  confidence: EdcConfidence;
  effort: EdcEffort;
}): number {
  const impactPart = (clamp01to100(params.impact) / 100) * 20;
  return clamp01to100(
    PRIORITY_WEIGHT[params.priority] +
      impactPart +
      URGENCY_WEIGHT[params.urgency] +
      CONF_WEIGHT[params.confidence] +
      EFFORT_BONUS[params.effort],
  );
}

export function sortDecisionQueue<T extends { score: number; priority: EdcPriority; impact: number }>(
  items: T[],
): T[] {
  const rank: Record<EdcPriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return [...items].sort(
    (a, b) =>
      b.score - a.score ||
      rank[b.priority] - rank[a.priority] ||
      b.impact - a.impact,
  );
}

export function dedupeDecisions<
  T extends { id: string; title: string; source: string; score: number },
>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = `${item.source}::${item.title.trim().toLowerCase()}`;
    const prev = map.get(key);
    if (!prev || item.score > prev.score) map.set(key, item);
  }
  return [...map.values()];
}
