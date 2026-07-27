/**
 * Sprint 21.7 — Eventos Outbox / Audit do Approval Runtime.
 */

import type { EnterpriseContext } from "../../enterprise/types.ts";
import type { ApprovalDecisionType, ApprovalRequestStatus } from "../types.ts";
import type { ApprovalRuntimeOperation } from "./approval-runtime-types.ts";

export type ApprovalOutboxEventType =
  | "APPROVAL_REQUESTED"
  | "APPROVAL_DECIDED"
  | "APPROVAL_DELEGATED"
  | "APPROVAL_ESCALATED"
  | "APPROVAL_EXPIRED"
  | "APPROVAL_CANCELLED"
  | "APPROVAL_REOPENED"
  | "APPROVAL_RETRY"
  | "APPROVAL_SLA_BREACH";

export function mapOperationToOutboxEvent(
  operation: ApprovalRuntimeOperation,
): ApprovalOutboxEventType {
  switch (operation) {
    case "request":
      return "APPROVAL_REQUESTED";
    case "approve":
    case "reject":
      return "APPROVAL_DECIDED";
    case "delegate":
      return "APPROVAL_DELEGATED";
    case "escalate":
      return "APPROVAL_ESCALATED";
    case "expire":
      return "APPROVAL_EXPIRED";
    case "cancel":
      return "APPROVAL_CANCELLED";
    case "reopen":
      return "APPROVAL_REOPENED";
    case "retry":
      return "APPROVAL_RETRY";
    default:
      return "APPROVAL_DECIDED";
  }
}

export function buildApprovalAuditPayload(input: {
  operation: ApprovalRuntimeOperation;
  requestId: string;
  decision?: ApprovalDecisionType | null;
  fromStatus?: ApprovalRequestStatus | null;
  toStatus?: ApprovalRequestStatus | null;
  levelId?: string | null;
  delegateTo?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return {
    event:
      input.operation === "request"
        ? "APPROVAL_REQUESTED"
        : "APPROVAL_RUNTIME_ACTION",
    category: "approval",
    severity: "info",
    targetType: "approval_request",
    targetId: input.requestId,
    module: "approval",
    description: input.operation,
    metadata: {
      decision: input.decision ?? null,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      levelId: input.levelId ?? null,
      delegateTo: input.delegateTo ?? null,
      ...(input.metadata ?? {}),
    },
  };
}

export function buildNotificationFromRuntime(input: {
  context: EnterpriseContext;
  requestId: string;
  title: string;
  message: string;
  recipientId: string;
  event: string;
  deduplicationKey: string;
}) {
  return {
    event: input.event,
    category: "approval",
    priority: "normal",
    title: input.title,
    message: input.message,
    recipients: [{ type: "user", id: input.recipientId, channel: "in_app" }],
    deduplicationKey: input.deduplicationKey,
  };
}
