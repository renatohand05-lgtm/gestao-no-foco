/**
 * Sprint 21.5 — Bridges tipados (snapshots · sem acoplamento circular).
 */

import { createRecipient } from "./notification-recipient.ts";
import { createNotificationRequest } from "./notification-request.ts";
import type { NotificationRequest } from "./types.ts";

/** Snapshot mínimo de ação de workflow. */
export type WorkflowActionSnapshot = {
  tenantId: string;
  userId?: string | null;
  workflowId?: string;
  workflowName?: string;
  instanceId?: string;
  event?: string;
  correlationId?: string | null;
};

export function notificationFromWorkflowAction(
  snapshot: WorkflowActionSnapshot,
): NotificationRequest {
  return createNotificationRequest({
    tenantId: snapshot.tenantId,
    event: "WORKFLOW_TRANSITIONED",
    templateId: "workflow-transitioned",
    recipients: [
      createRecipient({
        kind: "user",
        userId: snapshot.userId ?? "system",
      }),
    ],
    variables: {
      workflowName: snapshot.workflowName ?? snapshot.workflowId ?? "Workflow",
    },
    source: "workflow",
    correlationId: snapshot.correlationId ?? snapshot.instanceId ?? null,
    metadata: {
      workflowId: snapshot.workflowId,
      instanceId: snapshot.instanceId,
      targetId: snapshot.instanceId,
    },
  });
}

export type ApprovalActionSnapshot = {
  tenantId: string;
  userId?: string | null;
  approvalId: string;
  amount?: number | string | null;
  decision?: string;
  correlationId?: string | null;
};

export function notificationFromApprovalAction(
  snapshot: ApprovalActionSnapshot,
): NotificationRequest {
  const event =
    snapshot.decision === "REJECT"
      ? "APPROVAL_REJECTED"
      : snapshot.decision === "RETURN_FOR_ADJUSTMENT"
        ? "APPROVAL_RETURNED"
        : snapshot.decision === "EXPIRE"
          ? "APPROVAL_EXPIRED"
          : snapshot.decision === "APPROVE"
            ? "APPROVAL_APPROVED"
            : "APPROVAL_REQUESTED";

  return createNotificationRequest({
    tenantId: snapshot.tenantId,
    event,
    templateId: "approval-requested",
    recipients: [
      createRecipient({ kind: "user", userId: snapshot.userId ?? "approver" }),
    ],
    variables: {
      userName: snapshot.userId ?? "Usuário",
      amount: snapshot.amount ?? "—",
      approvalId: snapshot.approvalId,
    },
    source: "approval",
    correlationId: snapshot.correlationId ?? snapshot.approvalId,
    metadata: { targetId: snapshot.approvalId, decision: snapshot.decision },
  });
}

export type AuditEventSnapshot = {
  tenantId: string;
  userId?: string | null;
  auditEvent: string;
  correlationId?: string | null;
  message?: string;
};

export function notificationFromAuditEvent(
  snapshot: AuditEventSnapshot,
): NotificationRequest {
  return createNotificationRequest({
    tenantId: snapshot.tenantId,
    event: "SYSTEM_WARNING",
    templateId: "system-critical",
    recipients: [
      createRecipient({ kind: "user", userId: snapshot.userId ?? "admin" }),
    ],
    variables: {
      message: snapshot.message ?? `Evento de auditoria: ${snapshot.auditEvent}`,
    },
    source: "audit",
    correlationId: snapshot.correlationId ?? null,
    metadata: { auditEvent: snapshot.auditEvent },
  });
}

export type SecurityDecisionSnapshot = {
  tenantId: string;
  userId?: string | null;
  permission?: string;
  correlationId?: string | null;
};

export function notificationFromSecurityDecision(
  snapshot: SecurityDecisionSnapshot,
): NotificationRequest {
  return createNotificationRequest({
    tenantId: snapshot.tenantId,
    event: "SECURITY_ACCESS_DENIED",
    templateId: "security-access-denied",
    mandatory: true,
    recipients: [
      createRecipient({ kind: "user", userId: snapshot.userId ?? "unknown" }),
    ],
    variables: {
      userName: snapshot.userId ?? "Usuário",
    },
    source: "security",
    correlationId: snapshot.correlationId ?? null,
    metadata: { permission: snapshot.permission },
  });
}
