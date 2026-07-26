/**
 * Sprint 21.3 — Contexto de workflow (RBAC-ready via adapter de campos).
 */

import type {
  WorkflowActor,
  WorkflowContext,
  WorkflowTarget,
} from "./types.ts";

export type CreateWorkflowContextInput = {
  tenantId?: string | null;
  userId?: string | null;
  roles?: ReadonlyArray<string | null | undefined> | null;
  permissions?: ReadonlyArray<string | null | undefined> | null;
  variables?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  correlationId?: string | null;
  requestId?: string | null;
  actor?: WorkflowActor | null;
  target?: WorkflowTarget | null;
};

function asStringList(
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

export function createWorkflowContext(
  input: CreateWorkflowContextInput | null | undefined,
): WorkflowContext {
  if (!input || typeof input !== "object") {
    return {
      tenantId: null,
      userId: null,
      roles: [],
      permissions: [],
      variables: {},
      metadata: {},
      correlationId: null,
      requestId: null,
      actor: { userId: null, roles: [], permissions: [], type: "unknown" },
      target: null,
    };
  }

  const userId = trimOrNull(input.userId);
  const roles = asStringList(input.roles);
  const permissions = asStringList(input.permissions);

  const actor: WorkflowActor = input.actor ?? {
    userId,
    roles,
    permissions,
    type: userId ? "user" : "system",
  };

  return {
    tenantId: trimOrNull(input.tenantId),
    userId,
    roles,
    permissions,
    variables:
      input.variables && typeof input.variables === "object"
        ? { ...input.variables }
        : {},
    metadata:
      input.metadata && typeof input.metadata === "object"
        ? { ...input.metadata }
        : {},
    correlationId: trimOrNull(input.correlationId),
    requestId: trimOrNull(input.requestId),
    actor: {
      userId: actor.userId ?? userId,
      roles: actor.roles?.length ? [...actor.roles] : roles,
      permissions: actor.permissions?.length
        ? [...actor.permissions]
        : permissions,
      type: actor.type ?? (userId ? "user" : "system"),
    },
    target: input.target ?? null,
  };
}

export function isValidWorkflowContext(
  context: WorkflowContext | null | undefined,
): boolean {
  if (!context || typeof context !== "object") return false;
  if (!Array.isArray(context.roles) || !Array.isArray(context.permissions)) {
    return false;
  }
  return true;
}

/** Adapter: monta contexto a partir de um snapshot RBAC-like (sem importar lib/rbac). */
export function contextFromAuthSnapshot(input: {
  tenantId: string | null;
  userId: string | null;
  roles?: readonly string[];
  permissions?: readonly string[];
  correlationId?: string | null;
  requestId?: string | null;
  variables?: Record<string, unknown>;
}): WorkflowContext {
  return createWorkflowContext({
    tenantId: input.tenantId,
    userId: input.userId,
    roles: input.roles ?? [],
    permissions: input.permissions ?? [],
    correlationId: input.correlationId,
    requestId: input.requestId,
    variables: input.variables,
  });
}
