/**
 * Sprint 21.4 — Contexto de aprovação (RBAC/Workflow adapters via campos).
 */

import type {
  ApprovalActor,
  ApprovalContext,
  ApprovalTarget,
} from "./types.ts";

export type CreateApprovalContextInput = {
  tenantId?: string | null;
  userId?: string | null;
  roles?: ReadonlyArray<string | null | undefined> | null;
  permissions?: ReadonlyArray<string | null | undefined> | null;
  variables?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  correlationId?: string | null;
  requestId?: string | null;
  workflowId?: string | null;
  workflowInstanceId?: string | null;
  actor?: ApprovalActor | null;
  target?: ApprovalTarget | null;
  amount?: number | null;
  category?: string | null;
  priority?: string | null;
  tags?: ReadonlyArray<string | null | undefined> | null;
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

export function createApprovalContext(
  input: CreateApprovalContextInput | null | undefined,
): ApprovalContext {
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
      workflowId: null,
      workflowInstanceId: null,
      actor: { userId: null, roles: [], permissions: [], type: "unknown" },
      target: null,
      amount: null,
      category: null,
      priority: null,
      tags: [],
    };
  }

  const userId = trimOrNull(input.userId);
  const roles = asStringList(input.roles);
  const permissions = asStringList(input.permissions);
  const actor: ApprovalActor = input.actor ?? {
    userId,
    roles,
    permissions,
    type: userId ? "user" : "system",
  };

  const amount =
    typeof input.amount === "number" && Number.isFinite(input.amount)
      ? input.amount
      : null;

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
    workflowId: trimOrNull(input.workflowId),
    workflowInstanceId: trimOrNull(input.workflowInstanceId),
    actor: {
      userId: actor.userId ?? userId,
      roles: actor.roles?.length ? [...actor.roles] : roles,
      permissions: actor.permissions?.length
        ? [...actor.permissions]
        : permissions,
      type: actor.type ?? (userId ? "user" : "system"),
    },
    target: input.target ?? null,
    amount,
    category: trimOrNull(input.category),
    priority: trimOrNull(input.priority),
    tags: asStringList(input.tags),
  };
}

export function isValidApprovalContext(
  context: ApprovalContext | null | undefined,
): boolean {
  if (!context || typeof context !== "object") return false;
  if (!Array.isArray(context.roles) || !Array.isArray(context.permissions)) {
    return false;
  }
  return true;
}

/** Adapter RBAC-like — sem importar lib/rbac. */
export function contextFromAuthSnapshot(input: {
  tenantId: string | null;
  userId: string | null;
  roles?: readonly string[];
  permissions?: readonly string[];
  amount?: number | null;
  category?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  variables?: Record<string, unknown>;
}): ApprovalContext {
  return createApprovalContext({
    tenantId: input.tenantId,
    userId: input.userId,
    roles: input.roles ?? [],
    permissions: input.permissions ?? [],
    amount: input.amount,
    category: input.category,
    correlationId: input.correlationId,
    requestId: input.requestId,
    variables: input.variables,
  });
}

/** Adapter Workflow-like — sem importar lib/workflow. */
export function contextFromWorkflowSnapshot(input: {
  tenantId: string | null;
  userId: string | null;
  workflowId: string;
  workflowInstanceId: string;
  roles?: readonly string[];
  permissions?: readonly string[];
  amount?: number | null;
  variables?: Record<string, unknown>;
  correlationId?: string | null;
}): ApprovalContext {
  return createApprovalContext({
    tenantId: input.tenantId,
    userId: input.userId,
    workflowId: input.workflowId,
    workflowInstanceId: input.workflowInstanceId,
    roles: input.roles ?? [],
    permissions: input.permissions ?? [],
    amount: input.amount,
    variables: input.variables,
    correlationId: input.correlationId,
  });
}
