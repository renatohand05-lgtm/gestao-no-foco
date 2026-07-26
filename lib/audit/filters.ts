/**
 * Sprint 21.2 — Filtros de auditoria.
 */

import type { AuditEvent } from "./types.ts";

export type AuditFilterCriteria = {
  tenantId?: string | null;
  userId?: string | null;
  event?: string | null;
  events?: ReadonlyArray<string> | null;
  category?: string | null;
  categories?: ReadonlyArray<string> | null;
  severity?: string | null;
  severities?: ReadonlyArray<string> | null;
  module?: string | null;
  modules?: ReadonlyArray<string> | null;
  origin?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  from?: string | number | Date | null;
  to?: string | number | Date | null;
};

function toTime(value: string | number | Date | null | undefined): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function matchesList(
  value: string | null | undefined,
  single: string | null | undefined,
  list: ReadonlyArray<string> | null | undefined,
): boolean {
  if (single && value !== single) return false;
  if (list && list.length > 0) {
    if (!value || !list.includes(value)) return false;
  }
  return true;
}

export function matchesAuditFilter(
  event: AuditEvent,
  criteria: AuditFilterCriteria | null | undefined,
): boolean {
  if (!criteria) return true;

  if (criteria.tenantId && event.tenantId !== criteria.tenantId) return false;
  if (criteria.userId && event.userId !== criteria.userId) return false;

  if (!matchesList(event.event, criteria.event, criteria.events)) return false;
  if (!matchesList(event.category, criteria.category, criteria.categories)) {
    return false;
  }
  if (!matchesList(event.severity, criteria.severity, criteria.severities)) {
    return false;
  }
  if (!matchesList(event.module, criteria.module, criteria.modules)) {
    return false;
  }

  if (criteria.origin && event.origin !== criteria.origin) return false;
  if (
    criteria.correlationId &&
    event.correlationId !== criteria.correlationId
  ) {
    return false;
  }
  if (criteria.requestId && event.requestId !== criteria.requestId) {
    return false;
  }
  if (criteria.sessionId && event.sessionId !== criteria.sessionId) {
    return false;
  }
  if (criteria.targetType && event.targetType !== criteria.targetType) {
    return false;
  }
  if (criteria.targetId && event.targetId !== criteria.targetId) return false;

  const from = toTime(criteria.from);
  const to = toTime(criteria.to);
  const ts = new Date(event.timestamp).getTime();
  if (from != null && ts < from) return false;
  if (to != null && ts > to) return false;

  return true;
}

export function filterAuditEvents(
  events: readonly AuditEvent[],
  criteria: AuditFilterCriteria | null | undefined,
): AuditEvent[] {
  if (!criteria) return [...events];
  return events.filter((e) => matchesAuditFilter(e, criteria));
}

/**
 * Isola estritamente por tenant — nunca mistura empresas.
 */
export function filterByTenant(
  events: readonly AuditEvent[],
  tenantId: string,
): AuditEvent[] {
  const id = tenantId.trim();
  if (!id) return [];
  return events.filter((e) => e.tenantId === id);
}
