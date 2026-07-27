/**
 * Sprint 21.8 — Filtros, busca e agrupamento da Timeline.
 */

import type {
  TimelineEvent,
  TimelineFilters,
  TimelineGroup,
  TimelineGroupBy,
  TimelinePagination,
} from "./timeline-types.ts";
import { TIMELINE_DEFAULT_LIMIT, TIMELINE_MAX_LIMIT } from "./timeline-types.ts";

export function matchesTimelineSearch(
  event: TimelineEvent,
  search: string | null | undefined,
): boolean {
  const q = search?.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    event.title,
    event.description,
    event.module,
    event.category,
    event.status,
    event.actorName,
    event.entityId,
    event.source,
    ...event.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function filterTimelineEvents(
  events: readonly TimelineEvent[],
  filters: TimelineFilters,
): TimelineEvent[] {
  return events.filter((e) => {
    if (filters.tenantId && e.tenantId !== filters.tenantId) return false;
    if (filters.module && e.module !== filters.module) return false;
    if (filters.type && e.entityType !== filters.type) return false;
    if (filters.category && e.category !== filters.category) return false;
    if (filters.status && e.status !== filters.status) return false;
    if (filters.severity && e.severity !== filters.severity) return false;
    if (filters.source && e.source !== filters.source) return false;
    if (filters.entityType && e.entityType !== filters.entityType) return false;
    if (filters.entityId && e.entityId !== filters.entityId) return false;
    if (filters.userId && e.actor.id !== filters.userId) return false;
    if (filters.actorId && e.actor.id !== filters.actorId) return false;
    if (filters.dateFrom && e.createdAt < filters.dateFrom) return false;
    if (filters.dateTo && e.createdAt > filters.dateTo) return false;
    if (!matchesTimelineSearch(e, filters.search)) return false;
    return true;
  });
}

export function normalizePagination(
  pagination: TimelinePagination = {},
): Required<Pick<TimelinePagination, "limit" | "offset" | "order">> & {
  cursor: string | null;
} {
  const limit = Math.min(
    TIMELINE_MAX_LIMIT,
    Math.max(1, pagination.limit ?? TIMELINE_DEFAULT_LIMIT),
  );
  let offset = Math.max(0, pagination.offset ?? 0);
  if (pagination.cursor) {
    const decoded = Number.parseInt(pagination.cursor, 10);
    if (!Number.isNaN(decoded) && decoded >= 0) offset = decoded;
  }
  return {
    limit,
    offset,
    order: pagination.order ?? "desc",
    cursor: pagination.cursor ?? null,
  };
}

export function paginateTimelineEvents(
  events: readonly TimelineEvent[],
  pagination: TimelinePagination = {},
): {
  items: TimelineEvent[];
  total: number;
  limit: number;
  offset: number;
  nextCursor: string | null;
  hasMore: boolean;
} {
  const { limit, offset } = normalizePagination(pagination);
  const total = events.length;
  const items = events.slice(offset, offset + limit);
  const nextOffset = offset + items.length;
  const hasMore = nextOffset < total;
  return {
    items,
    total,
    limit,
    offset,
    nextCursor: hasMore ? String(nextOffset) : null,
    hasMore,
  };
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return dayKey(iso);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - onejan.getTime()) / 86_400_000 + onejan.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function groupTimelineEvents(
  events: readonly TimelineEvent[],
  groupBy: TimelineGroupBy = "day",
): TimelineGroup[] {
  if (groupBy === "none") {
    return [
      {
        key: "all",
        label: "Todos",
        count: events.length,
        items: [...events],
      },
    ];
  }

  const map = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    let key = "other";
    if (groupBy === "day") key = dayKey(e.createdAt);
    else if (groupBy === "week") key = weekKey(e.createdAt);
    else if (groupBy === "month") key = monthKey(e.createdAt);
    else if (groupBy === "module") key = e.module ?? "sem-modulo";
    else if (groupBy === "category") key = e.category ?? "sem-categoria";
    else if (groupBy === "user") key = e.actor.id ?? e.actorName ?? "sistema";

    const bucket = map.get(key) ?? [];
    bucket.push(e);
    map.set(key, bucket);
  }

  return [...map.entries()]
    .map(([key, items]) => ({
      key,
      label: key,
      count: items.length,
      items,
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}
