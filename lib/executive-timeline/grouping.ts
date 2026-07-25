/**
 * Executive Timeline — ordenação, dedupe e agrupamento (Gate 20.5).
 */

import { confidenceRank, severityRank } from "./format.ts";
import type {
  ExecutiveTimelineCategory,
  ExecutiveTimelineEvent,
  ExecutiveTimelineGroup,
  ExecutiveTimelineSort,
} from "./types.ts";
import { EXECUTIVE_TIMELINE_CATEGORY_LABEL } from "./types.ts";

function normalizeKey(title: string, category: string, source: string): string {
  return `${category}::${source}::${title.trim().toLowerCase()}`;
}

/** Remove duplicatas por título+categoria+fonte (mantém maior prioridade). */
export function dedupeTimelineEvents(
  events: ExecutiveTimelineEvent[],
): ExecutiveTimelineEvent[] {
  const map = new Map<string, ExecutiveTimelineEvent>();
  for (const e of events) {
    const key = normalizeKey(e.title, e.category, e.source);
    const prev = map.get(key);
    if (!prev || e.priority > prev.priority) {
      map.set(key, e);
    }
  }
  return [...map.values()];
}

export function sortTimelineEvents(
  events: ExecutiveTimelineEvent[],
  sort: ExecutiveTimelineSort = "recent",
): ExecutiveTimelineEvent[] {
  const copy = [...events];
  switch (sort) {
    case "impact":
      return copy.sort(
        (a, b) => b.impact - a.impact || b.priority - a.priority,
      );
    case "risk":
      return copy.sort(
        (a, b) =>
          severityRank(b.severity) - severityRank(a.severity) ||
          b.impact - a.impact ||
          b.priority - a.priority,
      );
    case "confidence":
      return copy.sort(
        (a, b) =>
          confidenceRank(b.confidence) - confidenceRank(a.confidence) ||
          b.priority - a.priority,
      );
    case "recent":
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() ||
          b.priority - a.priority,
      );
  }
}

export function filterByCategory(
  events: ExecutiveTimelineEvent[],
  categories: ExecutiveTimelineCategory[] | null,
): ExecutiveTimelineEvent[] {
  if (!categories || categories.length === 0) return events;
  const set = new Set(categories);
  return events.filter((e) => set.has(e.category));
}

/** Agrupa por categoria (ordem canônica). */
export function groupTimelineEvents(
  events: ExecutiveTimelineEvent[],
): ExecutiveTimelineGroup[] {
  const order: ExecutiveTimelineCategory[] = [
    "decision",
    "risk",
    "recommendation",
    "forecast",
    "cashflow",
    "finance",
    "sales",
    "goal",
    "operations",
    "inventory",
    "performance",
  ];
  const buckets = new Map<ExecutiveTimelineCategory, ExecutiveTimelineEvent[]>();
  for (const e of events) {
    const list = buckets.get(e.category) ?? [];
    list.push(e);
    buckets.set(e.category, list);
  }
  const groups: ExecutiveTimelineGroup[] = [];
  for (const cat of order) {
    const list = buckets.get(cat);
    if (!list || list.length === 0) continue;
    groups.push({
      key: cat,
      label: EXECUTIVE_TIMELINE_CATEGORY_LABEL[cat],
      events: list,
    });
  }
  return groups;
}
