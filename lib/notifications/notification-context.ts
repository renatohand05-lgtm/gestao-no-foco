/**
 * Sprint 21.5 — Contexto de notificação.
 */

import type { NotificationContext } from "./types.ts";

export type CreateNotificationContextInput = {
  tenantId?: string | null;
  userId?: string | null;
  roles?: ReadonlyArray<string | null | undefined> | null;
  permissions?: ReadonlyArray<string | null | undefined> | null;
  locale?: string | null;
  timezone?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  source?: string | null;
  nowHour?: number | null;
  variables?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

function asList(
  value: ReadonlyArray<string | null | undefined> | null | undefined,
): string[] {
  if (!value || !Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t || null;
}

export function createNotificationContext(
  input: CreateNotificationContextInput | null | undefined,
): NotificationContext {
  if (!input || typeof input !== "object") {
    return {
      tenantId: null,
      userId: null,
      roles: [],
      permissions: [],
      locale: null,
      timezone: null,
      correlationId: null,
      requestId: null,
      source: null,
      nowHour: null,
      variables: {},
      metadata: {},
    };
  }

  const nowHour =
    typeof input.nowHour === "number" &&
    Number.isFinite(input.nowHour) &&
    input.nowHour >= 0 &&
    input.nowHour <= 23
      ? Math.floor(input.nowHour)
      : null;

  return {
    tenantId: trimOrNull(input.tenantId),
    userId: trimOrNull(input.userId),
    roles: asList(input.roles),
    permissions: asList(input.permissions),
    locale: trimOrNull(input.locale),
    timezone: trimOrNull(input.timezone),
    correlationId: trimOrNull(input.correlationId),
    requestId: trimOrNull(input.requestId),
    source: trimOrNull(input.source),
    nowHour,
    variables:
      input.variables && typeof input.variables === "object"
        ? { ...input.variables }
        : {},
    metadata:
      input.metadata && typeof input.metadata === "object"
        ? { ...input.metadata }
        : {},
  };
}

export function isValidNotificationContext(
  context: NotificationContext | null | undefined,
): boolean {
  if (!context || typeof context !== "object") return false;
  return typeof context.tenantId === "string" && !!context.tenantId.trim();
}
