/**
 * Sprint 21.2 — Contexto de auditoria (multi-tenant).
 */

import { resolveActorType } from "./actors.ts";
import type { ActorType, AuditContext, AuditOrigin } from "./types.ts";

const ORIGINS: readonly AuditOrigin[] = [
  "ui",
  "api",
  "server_action",
  "middleware",
  "job",
  "workflow",
  "rbac",
  "system",
  "unknown",
];

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t || null;
}

export type CreateAuditContextInput = {
  tenantId?: string | null;
  userId?: string | null;
  actorType?: ActorType | string | null;
  role?: string | null;
  origin?: AuditOrigin | string | null;
  correlationId?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  ip?: string | null;
  device?: string | null;
  module?: string | null;
  resource?: string | null;
};

export function createAuditContext(
  input: CreateAuditContextInput | null | undefined,
): AuditContext | null {
  if (!input || typeof input !== "object") return null;

  const tenantId = trimOrNull(input.tenantId);
  if (!tenantId) return null;

  const originRaw = trimOrNull(input.origin);
  const origin: AuditOrigin =
    originRaw && (ORIGINS as readonly string[]).includes(originRaw)
      ? (originRaw as AuditOrigin)
      : "unknown";

  return {
    tenantId,
    userId: trimOrNull(input.userId),
    actorType: resolveActorType({
      userId: input.userId,
      actorType: input.actorType,
    }),
    role: trimOrNull(input.role),
    origin,
    correlationId: trimOrNull(input.correlationId),
    requestId: trimOrNull(input.requestId),
    sessionId: trimOrNull(input.sessionId),
    ip: trimOrNull(input.ip),
    device: trimOrNull(input.device),
    module: trimOrNull(input.module),
    resource: trimOrNull(input.resource),
  };
}

export function isValidAuditContext(
  context: AuditContext | null | undefined,
): context is AuditContext {
  if (!context || typeof context !== "object") return false;
  if (typeof context.tenantId !== "string" || !context.tenantId.trim()) {
    return false;
  }
  return true;
}

export function withCorrelation(
  context: AuditContext,
  correlationId: string,
): AuditContext {
  return {
    ...context,
    correlationId: correlationId.trim() || context.correlationId || null,
  };
}

export function withRequest(
  context: AuditContext,
  requestId: string,
): AuditContext {
  return {
    ...context,
    requestId: requestId.trim() || context.requestId || null,
  };
}

/** Garante que eventos de tenants diferentes não sejam misturados. */
export function assertSameTenant(
  events: readonly { tenantId: string }[],
  tenantId: string,
): boolean {
  if (!tenantId.trim()) return false;
  return events.every((e) => e.tenantId === tenantId);
}
