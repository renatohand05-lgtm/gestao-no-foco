/**
 * Sprint 21.2 — Formatação legível de eventos de auditoria.
 */

import { getAuditCategory } from "./categories.ts";
import { getAuditEventDefinition } from "./events.ts";
import { getAuditSeverity } from "./severity.ts";
import type { AuditEvent } from "./types.ts";

export function formatAuditTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

export function formatAuditEventTitle(event: AuditEvent): string {
  const def = getAuditEventDefinition(event.event);
  return def?.label ?? event.event;
}

export function formatAuditEventSummary(event: AuditEvent): string {
  const title = formatAuditEventTitle(event);
  const cat = getAuditCategory(event.category)?.label ?? event.category;
  const sev = getAuditSeverity(event.severity)?.label ?? event.severity;
  return `${title} · ${cat} · ${sev}`;
}

export function formatAuditActor(event: AuditEvent): string {
  if (event.userId) {
    const role = event.role ? ` (${event.role})` : "";
    return `${event.userId}${role}`;
  }
  return event.actorType;
}

export function formatAuditTarget(event: AuditEvent): string {
  if (event.targetType === "none") return "—";
  if (event.targetId) return `${event.targetType}:${event.targetId}`;
  return event.targetType;
}

export function formatAuditEventLine(event: AuditEvent): string {
  return [
    formatAuditTimestamp(event.timestamp),
    event.tenantId,
    formatAuditEventTitle(event),
    event.description,
  ].join(" | ");
}
