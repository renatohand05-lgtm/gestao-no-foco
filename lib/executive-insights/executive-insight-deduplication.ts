/**
 * Deduplicação semântica determinística por themeKey.
 */

import type { ExecutiveComposedInsight } from "@/lib/executive-insights/executive-insight-types";
import { mergeConfidence } from "@/lib/executive-insights/executive-insight-confidence";
import { INSIGHT_THEME_RULES } from "@/lib/executive-insights/executive-insight-rules";

function longer(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a.length >= b.length ? a : b;
}

/**
 * Mantém o insight de maior prioridade e agrega fontes / evidências.
 */
export function dedupeInsights(
  items: ExecutiveComposedInsight[],
): ExecutiveComposedInsight[] {
  const byTheme = new Map<string, ExecutiveComposedInsight>();

  for (const item of items) {
    const existing = byTheme.get(item.themeKey);
    if (!existing) {
      byTheme.set(item.themeKey, item);
      continue;
    }

    const winner =
      item.priority >= existing.priority ? item : existing;
    const loser =
      item.priority >= existing.priority ? existing : item;

    const sources = Array.from(
      new Set([...winner.sources, ...loser.sources]),
    );

    const preferredType =
      INSIGHT_THEME_RULES.find((r) => r.themeKey === item.themeKey)
        ?.preferredType ?? winner.type;

    byTheme.set(item.themeKey, {
      ...winner,
      type: winner.type === "informational" ? preferredType : winner.type,
      sources,
      evidence: longer(winner.evidence, loser.evidence),
      impact: longer(winner.impact, loser.impact),
      recommendation: longer(winner.recommendation, loser.recommendation),
      cta: winner.cta ?? loser.cta,
      confidence: mergeConfidence([winner.confidence, loser.confidence]),
      confidenceReason: winner.confidenceReason || loser.confidenceReason,
      relatedMetrics: [
        ...winner.relatedMetrics,
        ...loser.relatedMetrics.filter(
          (m) =>
            !winner.relatedMetrics.some(
              (w) => w.label === m.label && w.value === m.value,
            ),
        ),
      ].slice(0, 6),
      summary: longer(winner.summary, loser.summary) ?? winner.summary,
    });
  }

  return Array.from(byTheme.values());
}
