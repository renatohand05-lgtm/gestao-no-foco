/**
 * Sprint 21.2 — Busca de auditoria (texto + critérios estruturados).
 */

import {
  filterAuditEvents,
  type AuditFilterCriteria,
} from "./filters.ts";
import { sortAuditEvents } from "./timeline.ts";
import type { AuditEvent } from "./types.ts";

export type AuditSearchQuery = AuditFilterCriteria & {
  text?: string | null;
  limit?: number;
};

function haystack(event: AuditEvent): string {
  return [
    event.event,
    event.category,
    event.severity,
    event.description,
    event.userId,
    event.tenantId,
    event.module,
    event.resource,
    event.targetType,
    event.targetId,
    event.correlationId,
    event.requestId,
    event.role,
    JSON.stringify(event.metadata),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function searchAuditEvents(
  events: readonly AuditEvent[],
  query: AuditSearchQuery | null | undefined,
): AuditEvent[] {
  if (!query) return sortAuditEvents(events, "desc");

  const { text, limit, ...criteria } = query;
  let results = filterAuditEvents(events, criteria);

  const q = typeof text === "string" ? text.trim().toLowerCase() : "";
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    results = results.filter((event) => {
      const h = haystack(event);
      return terms.every((t) => h.includes(t));
    });
  }

  results = sortAuditEvents(results, "desc");
  if (limit != null && limit >= 0) {
    results = results.slice(0, Math.floor(limit));
  }
  return results;
}

export function findByCorrelationId(
  events: readonly AuditEvent[],
  correlationId: string,
): AuditEvent[] {
  const id = correlationId.trim();
  if (!id) return [];
  return sortAuditEvents(
    events.filter((e) => e.correlationId === id),
    "asc",
  );
}

export function findByRequestId(
  events: readonly AuditEvent[],
  requestId: string,
): AuditEvent[] {
  const id = requestId.trim();
  if (!id) return [];
  return sortAuditEvents(
    events.filter((e) => e.requestId === id),
    "asc",
  );
}
