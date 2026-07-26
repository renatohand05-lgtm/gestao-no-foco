/**
 * Sprint 21.2 — Timeline Engine de auditoria.
 */

import { getAuditCategory } from "./categories.ts";
import { getAuditEventDefinition } from "./events.ts";
import { filterAuditEvents, filterByTenant, type AuditFilterCriteria } from "./filters.ts";
import { getAuditSeverity } from "./severity.ts";
import type {
  AuditEvent,
  AuditTimelineGroup,
  AuditTimelineGroupBy,
} from "./types.ts";

export function sortAuditEvents(
  events: readonly AuditEvent[],
  direction: "asc" | "desc" = "desc",
): AuditEvent[] {
  const sorted = [...events].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}

export function latestAuditEvents(
  events: readonly AuditEvent[],
  limit = 20,
): AuditEvent[] {
  const n = Math.max(0, Math.floor(limit));
  return sortAuditEvents(events, "desc").slice(0, n);
}

export function eventsByUser(
  events: readonly AuditEvent[],
  userId: string,
): AuditEvent[] {
  const id = userId.trim();
  if (!id) return [];
  return sortAuditEvents(
    events.filter((e) => e.userId === id),
    "desc",
  );
}

export function eventsByTenant(
  events: readonly AuditEvent[],
  tenantId: string,
): AuditEvent[] {
  return sortAuditEvents(filterByTenant(events, tenantId), "desc");
}

export function eventsByModule(
  events: readonly AuditEvent[],
  module: string,
): AuditEvent[] {
  const m = module.trim();
  if (!m) return [];
  return sortAuditEvents(
    events.filter((e) => e.module === m),
    "desc",
  );
}

export function eventsByCategory(
  events: readonly AuditEvent[],
  category: string,
): AuditEvent[] {
  return sortAuditEvents(
    events.filter((e) => e.category === category),
    "desc",
  );
}

export function eventsBySeverity(
  events: readonly AuditEvent[],
  severity: string,
): AuditEvent[] {
  return sortAuditEvents(
    events.filter((e) => e.severity === severity),
    "desc",
  );
}

function groupKey(
  event: AuditEvent,
  by: AuditTimelineGroupBy,
): { key: string; label: string } {
  switch (by) {
    case "day": {
      const day = event.timestamp.slice(0, 10);
      return { key: day, label: day };
    }
    case "hour": {
      const hour = event.timestamp.slice(0, 13);
      return { key: hour, label: `${hour}:00` };
    }
    case "event": {
      const def = getAuditEventDefinition(event.event);
      return { key: event.event, label: def?.label ?? event.event };
    }
    case "category": {
      const cat = getAuditCategory(event.category);
      return { key: event.category, label: cat?.label ?? event.category };
    }
    case "severity": {
      const sev = getAuditSeverity(event.severity);
      return { key: event.severity, label: sev?.label ?? event.severity };
    }
    case "module": {
      const mod = event.module ?? "—";
      return { key: mod, label: mod };
    }
    case "user": {
      const u = event.userId ?? "system";
      return { key: u, label: u };
    }
    case "tenant": {
      return { key: event.tenantId, label: event.tenantId };
    }
    default:
      return { key: "all", label: "Todos" };
  }
}

export function groupAuditEvents(
  events: readonly AuditEvent[],
  by: AuditTimelineGroupBy,
): AuditTimelineGroup[] {
  const map = new Map<
    string,
    { key: string; label: string; events: AuditEvent[] }
  >();

  for (const event of sortAuditEvents(events, "desc")) {
    const { key, label } = groupKey(event, by);
    const existing = map.get(key);
    if (existing) {
      existing.events.push(event);
    } else {
      map.set(key, {
        key,
        label,
        events: [event],
      });
    }
  }

  return [...map.values()].map((g) => ({
    key: g.key,
    label: g.label,
    count: g.events.length,
    events: g.events,
  }));
}

export function buildAuditTimeline(
  events: readonly AuditEvent[],
  options?: {
    tenantId?: string;
    filters?: AuditFilterCriteria;
    limit?: number;
    groupBy?: AuditTimelineGroupBy;
  },
): {
  events: AuditEvent[];
  groups: AuditTimelineGroup[] | null;
} {
  let list = [...events];
  if (options?.tenantId) {
    list = filterByTenant(list, options.tenantId);
  }
  if (options?.filters) {
    list = filterAuditEvents(list, {
      ...options.filters,
      tenantId: options.tenantId ?? options.filters.tenantId,
    });
  }
  list = sortAuditEvents(list, "desc");
  if (options?.limit != null) {
    list = list.slice(0, Math.max(0, options.limit));
  }

  const groups = options?.groupBy
    ? groupAuditEvents(list, options.groupBy)
    : null;

  return { events: list, groups };
}
