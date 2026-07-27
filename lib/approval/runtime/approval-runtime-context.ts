/**
 * Sprint 21.7 — Ponte EnterpriseContext ↔ ApprovalContext (RBAC/Workflow).
 */

import type { EnterpriseContext } from "../../enterprise/types.ts";
import { contextFromAuthSnapshot, contextFromWorkflowSnapshot } from "../approval-context.ts";
import type { ApprovalContext } from "../types.ts";

export type AuthorizationSnapshot = {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  overrides?: { permissionKey: string; effect: string }[];
};

export function approvalContextFromEnterprise(
  context: EnterpriseContext,
  snapshot?: AuthorizationSnapshot | null,
  extras?: {
    amount?: number | null;
    category?: string | null;
    priority?: string | null;
    workflowId?: string | null;
    workflowInstanceId?: string | null;
  },
): ApprovalContext {
  const roles = snapshot?.roles?.length
    ? snapshot.roles
    : [...context.roles];
  const permissions = snapshot?.permissions?.length
    ? snapshot.permissions
    : [...context.permissions];

  if (extras?.workflowInstanceId && extras.workflowId) {
    return contextFromWorkflowSnapshot({
      tenantId: context.tenantId,
      userId: context.userId,
      workflowId: extras.workflowId,
      workflowInstanceId: extras.workflowInstanceId,
      roles,
      permissions,
      amount: extras.amount,
      correlationId: context.correlationId,
    });
  }

  return contextFromAuthSnapshot({
    tenantId: context.tenantId,
    userId: context.userId,
    roles,
    permissions,
    amount: extras?.amount,
    category: extras?.category,
    correlationId: context.correlationId,
    requestId: context.requestId,
  });
}

export function mergeEnterpriseRoles(
  context: EnterpriseContext,
  snapshot: AuthorizationSnapshot | null | undefined,
): EnterpriseContext {
  if (!snapshot) return context;
  return {
    ...context,
    roles: snapshot.roles.length ? snapshot.roles : context.roles,
    permissions: snapshot.permissions.length
      ? snapshot.permissions
      : context.permissions,
  };
}
