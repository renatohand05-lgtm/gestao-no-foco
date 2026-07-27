/**
 * Sprint 21.4 — Decisões e ações tipadas (audit/notification adapters).
 */

import type {
  ApprovalDecisionType,
  ApprovalPendingAction,
  ApprovalPendingActionType,
} from "./types.ts";

export const APPROVAL_DECISION_TYPES = [
  "APPROVE",
  "REJECT",
  "RETURN_FOR_ADJUSTMENT",
  "CANCEL",
  "EXPIRE",
  "AUTO_APPROVE",
  "AUTO_REJECT",
] as const satisfies readonly ApprovalDecisionType[];

export const APPROVAL_ACTION_TYPES = [
  "WRITE_AUDIT_EVENT",
  "SEND_NOTIFICATION",
  "SEND_EMAIL",
  "SEND_PUSH",
  "CREATE_INBOX",
  "ESCALATE_LEVEL",
  "EXPIRE_REQUEST",
  "EMIT_WORKFLOW_EVENT",
] as const satisfies readonly ApprovalPendingActionType[];

export function isKnownDecisionType(
  value: string,
): value is ApprovalDecisionType {
  return (APPROVAL_DECISION_TYPES as readonly string[]).includes(value);
}

export function isTerminalDecision(type: ApprovalDecisionType): boolean {
  return (
    type === "REJECT" ||
    type === "CANCEL" ||
    type === "EXPIRE" ||
    type === "AUTO_REJECT" ||
    type === "RETURN_FOR_ADJUSTMENT"
  );
}

export function isApprovalDecision(type: ApprovalDecisionType): boolean {
  return type === "APPROVE" || type === "AUTO_APPROVE";
}

let actionSeq = 0;

export function createPendingAction(input: {
  type: ApprovalPendingActionType;
  description?: string;
  payload?: Record<string, unknown>;
  requestId: string;
  definitionId: string;
  tenantId: string | null;
  origin?: ApprovalPendingAction["origin"];
  at?: string;
}): ApprovalPendingAction {
  actionSeq += 1;
  return {
    id: `apa_${actionSeq}_${Math.random().toString(36).slice(2, 7)}`,
    type: input.type,
    description: input.description ?? input.type,
    payload: input.payload ?? {},
    requestId: input.requestId,
    definitionId: input.definitionId,
    tenantId: input.tenantId,
    createdAt: input.at ?? new Date().toISOString(),
    origin: input.origin ?? "decision",
  };
}

/** Adapter Audit — intenção tipada, sem chamar lib/audit. */
export function createWriteAuditAction(
  payload: Record<string, unknown>,
  meta: {
    requestId: string;
    definitionId: string;
    tenantId: string | null;
    at?: string;
  },
): ApprovalPendingAction {
  return createPendingAction({
    type: "WRITE_AUDIT_EVENT",
    description: "Registrar evento de auditoria",
    payload,
    ...meta,
  });
}

/** Adapter Notification — intenções tipadas, sem executar. */
export function createNotificationActions(
  meta: {
    requestId: string;
    definitionId: string;
    tenantId: string | null;
    at?: string;
  },
  payload: Record<string, unknown> = {},
): ApprovalPendingAction[] {
  return [
    createPendingAction({
      type: "SEND_NOTIFICATION",
      description: "Enviar notificação",
      payload,
      ...meta,
    }),
    createPendingAction({
      type: "SEND_EMAIL",
      description: "Enviar e-mail",
      payload,
      ...meta,
    }),
    createPendingAction({
      type: "SEND_PUSH",
      description: "Enviar push",
      payload,
      ...meta,
    }),
    createPendingAction({
      type: "CREATE_INBOX",
      description: "Criar item na caixa de entrada",
      payload,
      ...meta,
    }),
  ];
}

export function __resetApprovalActionSeqForTests(): void {
  actionSeq = 0;
}
