/**
 * Sprint 21.5 — Timeline e filtros.
 */

import type {
  NotificationChannelId,
  NotificationHistoryEntry,
  NotificationResult,
} from "./types.ts";

export type TimelineFilter = {
  tenantId?: string | null;
  recipientId?: string | null;
  channel?: NotificationChannelId | null;
  type?: NotificationHistoryEntry["type"] | null;
  from?: string | null;
  to?: string | null;
  correlationId?: string | null;
};

export function filterHistory(
  entries: readonly NotificationHistoryEntry[],
  filter: TimelineFilter | null | undefined,
): NotificationHistoryEntry[] {
  if (!filter) return [...entries];
  const fromT = filter.from ? new Date(filter.from).getTime() : null;
  const toT = filter.to ? new Date(filter.to).getTime() : null;

  return entries.filter((e) => {
    if (filter.recipientId && e.recipientId !== filter.recipientId) return false;
    if (filter.channel && e.channel !== filter.channel) return false;
    if (filter.type && e.type !== filter.type) return false;
    if (
      filter.correlationId &&
      e.metadata?.correlationId !== filter.correlationId
    ) {
      return false;
    }
    const t = new Date(e.at).getTime();
    if (fromT != null && !Number.isNaN(fromT) && t < fromT) return false;
    if (toT != null && !Number.isNaN(toT) && t > toT) return false;
    return true;
  });
}

export function sortHistory(
  entries: readonly NotificationHistoryEntry[],
  direction: "asc" | "desc" = "asc",
): NotificationHistoryEntry[] {
  const sorted = [...entries].sort((a, b) => {
    const ta = new Date(a.at).getTime();
    const tb = new Date(b.at).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}

export function groupHistoryByChannel(
  entries: readonly NotificationHistoryEntry[],
): { key: string; count: number; entries: NotificationHistoryEntry[] }[] {
  const map = new Map<string, NotificationHistoryEntry[]>();
  for (const e of sortHistory(entries, "asc")) {
    const key = e.channel ?? "none";
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return [...map.entries()].map(([key, list]) => ({
    key,
    count: list.length,
    entries: list,
  }));
}

export function timelineFromResult(
  result: NotificationResult,
  filter?: TimelineFilter,
): NotificationHistoryEntry[] {
  let entries = [...result.history];
  if (filter?.tenantId && result.request.tenantId !== filter.tenantId) {
    return [];
  }
  entries = filterHistory(entries, filter);
  return sortHistory(entries, "desc");
}
