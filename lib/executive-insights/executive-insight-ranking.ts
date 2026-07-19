/**
 * Ranking determinístico dos insights compostos.
 */

import type { ExecutiveComposedInsight } from "@/lib/executive-insights/executive-insight-types";

export function rankInsights(
  items: ExecutiveComposedInsight[],
): ExecutiveComposedInsight[] {
  return [...items].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.themeKey < b.themeKey) return -1;
    if (a.themeKey > b.themeKey) return 1;
    return a.id.localeCompare(b.id);
  });
}

export function partitionTopInsights(ranked: ExecutiveComposedInsight[]): {
  primary: ExecutiveComposedInsight | null;
  risks: ExecutiveComposedInsight[];
  opportunities: ExecutiveComposedInsight[];
  positives: ExecutiveComposedInsight[];
  informational: ExecutiveComposedInsight[];
  more: ExecutiveComposedInsight[];
} {
  const primary =
    ranked.find(
      (i) =>
        i.type === "critical" ||
        i.type === "warning" ||
        (i.cta != null && i.confidence !== "baixa"),
    ) ?? ranked[0] ?? null;

  const used = new Set<string>();
  if (primary) used.add(primary.id);

  const pick = (
    predicate: (i: ExecutiveComposedInsight) => boolean,
    limit: number,
  ) => {
    const out: ExecutiveComposedInsight[] = [];
    for (const item of ranked) {
      if (used.has(item.id)) continue;
      if (!predicate(item)) continue;
      out.push(item);
      used.add(item.id);
      if (out.length >= limit) break;
    }
    return out;
  };

  const risks = pick(
    (i) => i.type === "critical" || i.type === "warning",
    2,
  );
  const opportunities = pick((i) => i.type === "opportunity", 2);
  const positives = pick((i) => i.type === "positive", 2);
  const informational = pick((i) => i.type === "informational", 2);
  const more = ranked.filter((i) => !used.has(i.id));

  return { primary, risks, opportunities, positives, informational, more };
}
