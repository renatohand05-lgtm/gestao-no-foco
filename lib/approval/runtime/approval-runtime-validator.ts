/**
 * Sprint 21.7 — Validação RBAC para operações do runtime.
 */

import type { EnterpriseContext } from "../../enterprise/types.ts";
import {
  APPROVAL_RUNTIME_ERROR_CODES,
  ApprovalRuntimeError,
} from "./approval-runtime-errors.ts";
import type { ApprovalRuntimeOperation } from "./approval-runtime-types.ts";
import type { AuthorizationSnapshot } from "./approval-runtime-context.ts";

export const APPROVAL_RUNTIME_PERMISSIONS = {
  approve: "financeiro.aprovar",
  reject: "financeiro.aprovar",
  cancel: "financeiro.aprovar",
  delegate: "financeiro.aprovar",
  escalate: "financeiro.aprovar",
  reopen: "financeiro.aprovar",
  consult: "auditoria.read",
  request: "financeiro.aprovar",
} as const;

const OPERATION_PERMISSION: Record<
  ApprovalRuntimeOperation,
  keyof typeof APPROVAL_RUNTIME_PERMISSIONS
> = {
  request: "request",
  approve: "approve",
  reject: "reject",
  cancel: "cancel",
  expire: "escalate",
  delegate: "delegate",
  escalate: "escalate",
  reopen: "reopen",
  retry: "approve",
  resolve_next: "consult",
};

export function hasRuntimePermission(
  snapshot: AuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
  operation: ApprovalRuntimeOperation,
): boolean {
  const key = APPROVAL_RUNTIME_PERMISSIONS[OPERATION_PERMISSION[operation]];
  const perms = snapshot?.permissions?.length
    ? snapshot.permissions
    : context.permissions;
  if (perms.includes(key)) return true;
  if (operation === "expire" && context.actorType !== "user") return true;
  if (operation === "escalate" && context.actorType === "system") return true;
  return false;
}

export function assertRuntimePermission(
  snapshot: AuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
  operation: ApprovalRuntimeOperation,
): void {
  if (!hasRuntimePermission(snapshot, context, operation)) {
    throw new ApprovalRuntimeError(
      `Permissão insuficiente para ${operation}.`,
      APPROVAL_RUNTIME_ERROR_CODES.PERMISSION_DENIED,
    );
  }
}

export function canApprove(
  snapshot: AuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
): boolean {
  return hasRuntimePermission(snapshot, context, "approve");
}

export function canReject(
  snapshot: AuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
): boolean {
  return hasRuntimePermission(snapshot, context, "reject");
}

export function canCancel(
  snapshot: AuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
): boolean {
  return hasRuntimePermission(snapshot, context, "cancel");
}

export function canDelegate(
  snapshot: AuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
): boolean {
  return hasRuntimePermission(snapshot, context, "delegate");
}

export function canEscalate(
  snapshot: AuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
): boolean {
  return hasRuntimePermission(snapshot, context, "escalate");
}

export function canReopen(
  snapshot: AuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
): boolean {
  return hasRuntimePermission(snapshot, context, "reopen");
}

export function canConsult(
  snapshot: AuthorizationSnapshot | null | undefined,
  context: EnterpriseContext,
): boolean {
  return hasRuntimePermission(snapshot, context, "resolve_next");
}
