/**
 * Sprint 21.2 — Recorder: constrói e normaliza o AuditEvent completo.
 */

import { resolveActorType } from "./actors.ts";
import { isKnownAuditCategory } from "./categories.ts";
import { isValidAuditContext } from "./context.ts";
import { getAuditEventDefinition, isKnownAuditEvent } from "./events.ts";
import { normalizeMetadata } from "./metadata.ts";
import { isKnownAuditSeverity } from "./severity.ts";
import {
  inferTargetTypeFromEvent,
  normalizeTargetType,
} from "./targets.ts";
import type {
  AuditContext,
  AuditErrorCode,
  AuditEvent,
  AuditLogInput,
  AuditOrigin,
  AuditRecordResult,
} from "./types.ts";

let seq = 0;

function nextId(timestamp: string): string {
  seq += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `aud_${timestamp.replace(/[:.]/g, "")}_${seq}_${rand}`;
}

function toIsoTimestamp(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function fail(code: AuditErrorCode, error: string): AuditRecordResult {
  return { ok: false, code, error };
}

/**
 * Constrói evento completo a partir do contexto + input.
 * Determinístico quanto a normalização; id inclui sequência local.
 */
export function recordAuditEvent(
  context: AuditContext | null | undefined,
  input: AuditLogInput | null | undefined,
): AuditRecordResult {
  if (!isValidAuditContext(context)) {
    const missingTenant =
      context != null &&
      typeof context === "object" &&
      (!("tenantId" in context) ||
        typeof (context as { tenantId?: unknown }).tenantId !== "string" ||
        !(context as { tenantId?: string }).tenantId?.trim());
    return fail(
      missingTenant ? "MISSING_TENANT" : "INVALID_CONTEXT",
      "Contexto de auditoria inválido ou tenant ausente.",
    );
  }

  const auth = context;

  if (!input || typeof input !== "object" || !input.event) {
    return fail("INVALID_INPUT", "Entrada de auditoria inválida.");
  }

  const eventCode =
    typeof input.event === "string" ? input.event.trim() : "";
  if (!eventCode) {
    return fail("INVALID_EVENT", "Código de evento ausente.");
  }
  if (!isKnownAuditEvent(eventCode)) {
    return fail("INVALID_EVENT", `Evento desconhecido: ${eventCode}`);
  }

  const def = getAuditEventDefinition(eventCode)!;

  const categoryRaw =
    typeof input.category === "string" && input.category.trim()
      ? input.category.trim()
      : def.defaultCategory;

  if (!isKnownAuditCategory(categoryRaw)) {
    return fail("INVALID_CATEGORY", `Categoria inválida: ${categoryRaw}`);
  }

  const severityRaw =
    typeof input.severity === "string" && input.severity.trim()
      ? input.severity.trim()
      : def.defaultSeverity;

  if (!isKnownAuditSeverity(severityRaw)) {
    return fail("INVALID_SEVERITY", `Severidade inválida: ${severityRaw}`);
  }

  const timestamp = toIsoTimestamp(input.timestamp);
  const origin: AuditOrigin = input.origin ?? auth.origin ?? "unknown";

  const event: AuditEvent = {
    id: nextId(timestamp),
    tenantId: auth.tenantId,
    userId: auth.userId,
    actorType: resolveActorType({
      userId: auth.userId,
      actorType: auth.actorType,
    }),
    role: auth.role ?? null,
    timestamp,
    event: eventCode,
    category: categoryRaw,
    severity: severityRaw,
    targetType: input.targetType
      ? normalizeTargetType(input.targetType)
      : inferTargetTypeFromEvent(eventCode),
    targetId:
      typeof input.targetId === "string" && input.targetId.trim()
        ? input.targetId.trim()
        : null,
    resource:
      (typeof input.resource === "string" && input.resource.trim()
        ? input.resource.trim()
        : auth.resource) ?? null,
    module:
      (typeof input.module === "string" && input.module.trim()
        ? input.module.trim()
        : auth.module) ?? null,
    description:
      (typeof input.description === "string" && input.description.trim()
        ? input.description.trim()
        : def.description) || def.label,
    metadata: normalizeMetadata(input.metadata ?? {}),
    origin,
    correlationId: input.correlationId ?? auth.correlationId ?? null,
    requestId: input.requestId ?? auth.requestId ?? null,
    sessionId: input.sessionId ?? auth.sessionId ?? null,
    ip: auth.ip ?? null,
    device: auth.device ?? null,
  };

  return { ok: true, event };
}

/** Reset de sequência — apenas para testes. */
export function __resetAuditRecorderSeqForTests(): void {
  seq = 0;
}
