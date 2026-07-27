/**
 * Sprint 21.6 — Correlação / request ids.
 */

import type { EnterpriseContext } from "./types.ts";

export function ensureCorrelationId(
  context: Pick<EnterpriseContext, "correlationId" | "requestId">,
): string {
  return context.correlationId || context.requestId;
}

export function withCorrelation<T extends Record<string, unknown>>(
  context: Pick<EnterpriseContext, "correlationId" | "requestId" | "tenantId">,
  payload: T,
): T & {
  correlationId: string;
  requestId: string;
  tenantId: string;
} {
  return {
    ...payload,
    correlationId: ensureCorrelationId(context),
    requestId: context.requestId,
    tenantId: context.tenantId,
  };
}

export function stableHash(value: unknown): string {
  let json: string;
  try {
    if (value === null || value === undefined) {
      json = String(value);
    } else if (typeof value === "object") {
      json = JSON.stringify(value);
    } else {
      json = String(value);
    }
  } catch {
    json = String(value);
  }
  // FNV-1a 32-bit determinístico (sem crypto externo)
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `h${(hash >>> 0).toString(16)}`;
}
