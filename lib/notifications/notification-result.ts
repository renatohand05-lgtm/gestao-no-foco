/**
 * Sprint 21.5 — Result helpers / pending actions / audit intent.
 */

import type {
  NotificationAuditIntent,
  NotificationPendingAction,
  NotificationRequest,
  NotificationResult,
  NotificationStatusId,
} from "./types.ts";

let actionSeq = 0;

export function createPendingAction(input: {
  type: NotificationPendingAction["type"];
  description?: string;
  payload?: Record<string, unknown>;
  notificationId: string;
  tenantId: string;
  at?: string;
}): NotificationPendingAction {
  actionSeq += 1;
  return {
    id: `npa_${actionSeq}`,
    type: input.type,
    description: input.description ?? input.type,
    payload: input.payload ?? {},
    notificationId: input.notificationId,
    tenantId: input.tenantId,
    createdAt: input.at ?? new Date().toISOString(),
  };
}

export function createAuditIntent(
  request: NotificationRequest,
  channels: readonly string[],
  recipientCount: number,
  event = "NOTIFICATION_ROUTED",
): NotificationAuditIntent {
  return {
    event,
    notificationId: request.id,
    tenantId: request.tenantId,
    channels: channels as NotificationAuditIntent["channels"],
    recipientCount,
    correlationId: request.correlationId,
    metadata: {
      notificationEvent: request.event,
      priority: request.priority,
      category: request.category,
    },
  };
}

export function emptyResult(
  request: NotificationRequest,
  status: NotificationStatusId,
  reason: string,
  explanation: string[] = [],
): NotificationResult {
  return {
    ok: false,
    status,
    reason,
    request,
    renderedTitle: null,
    renderedMessage: null,
    routedChannels: [],
    resolvedRecipients: [],
    attempts: [],
    history: [],
    pendingActions: [],
    auditIntent: null,
    suppressed: status === "suppressed",
    deduplicated: status === "deduplicated",
    explanation,
  };
}

export function __resetPendingActionSeqForTests(): void {
  actionSeq = 0;
}
