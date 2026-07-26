/**
 * Sprint 21.2 — Exportação de auditoria (sem gravar arquivos).
 * Formatos: JSON · CSV · Timeline (texto).
 */

import { formatAuditEventLine, formatAuditTimestamp } from "./formatter.ts";
import { sortAuditEvents } from "./timeline.ts";
import type {
  AuditEvent,
  AuditExportFormat,
  AuditExportResult,
} from "./types.ts";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportJson(events: readonly AuditEvent[]): string {
  return JSON.stringify(events, null, 2);
}

function exportCsv(events: readonly AuditEvent[]): string {
  const headers = [
    "id",
    "timestamp",
    "tenantId",
    "userId",
    "event",
    "category",
    "severity",
    "module",
    "description",
    "targetType",
    "targetId",
    "correlationId",
    "requestId",
    "origin",
  ];

  const rows = events.map((e) =>
    [
      e.id,
      e.timestamp,
      e.tenantId,
      e.userId ?? "",
      e.event,
      e.category,
      e.severity,
      e.module ?? "",
      e.description,
      e.targetType,
      e.targetId ?? "",
      e.correlationId ?? "",
      e.requestId ?? "",
      e.origin,
    ]
      .map((v) => csvEscape(String(v)))
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

function exportTimeline(events: readonly AuditEvent[]): string {
  const sorted = sortAuditEvents(events, "desc");
  if (sorted.length === 0) return "# Audit Timeline\n(sem eventos)\n";

  const lines = [
    "# Audit Timeline",
    `# Generated: ${formatAuditTimestamp(new Date().toISOString())}`,
    `# Events: ${sorted.length}`,
    "",
  ];

  for (const event of sorted) {
    lines.push(`- ${formatAuditEventLine(event)}`);
  }

  return `${lines.join("\n")}\n`;
}

export function exportAuditEvents(
  events: readonly AuditEvent[],
  format: AuditExportFormat = "json",
  options?: { tenantId?: string },
): AuditExportResult {
  let list = [...events];
  if (options?.tenantId) {
    const tid = options.tenantId.trim();
    list = list.filter((e) => e.tenantId === tid);
  }
  list = sortAuditEvents(list, "desc");

  const stamp = new Date().toISOString().slice(0, 10);
  const tenantPart = options?.tenantId
    ? `_${options.tenantId.slice(0, 24)}`
    : "";

  if (format === "csv") {
    return {
      format: "csv",
      content: exportCsv(list),
      mimeType: "text/csv; charset=utf-8",
      filenameSuggestion: `audit${tenantPart}_${stamp}.csv`,
      eventCount: list.length,
    };
  }

  if (format === "timeline") {
    return {
      format: "timeline",
      content: exportTimeline(list),
      mimeType: "text/plain; charset=utf-8",
      filenameSuggestion: `audit-timeline${tenantPart}_${stamp}.txt`,
      eventCount: list.length,
    };
  }

  return {
    format: "json",
    content: exportJson(list),
    mimeType: "application/json; charset=utf-8",
    filenameSuggestion: `audit${tenantPart}_${stamp}.json`,
    eventCount: list.length,
  };
}
