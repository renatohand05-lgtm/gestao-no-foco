/**
 * Sprint 21.3 — Ações tipadas (intenções · sem efeitos externos).
 */

import type {
  WorkflowAction,
  WorkflowActionType,
  WorkflowPendingAction,
  WorkflowTransition,
} from "./types.ts";

export const WORKFLOW_ACTION_TYPES = [
  "CREATE_TASK",
  "REQUEST_APPROVAL",
  "SEND_NOTIFICATION",
  "WRITE_AUDIT_EVENT",
  "ASSIGN_OWNER",
  "SET_DUE_DATE",
  "UPDATE_METADATA",
  "EMIT_DOMAIN_EVENT",
  "PAUSE_WORKFLOW",
  "COMPLETE_WORKFLOW",
] as const satisfies readonly WorkflowActionType[];

export function isKnownActionType(value: string): value is WorkflowActionType {
  return (WORKFLOW_ACTION_TYPES as readonly string[]).includes(value);
}

export function createAction(
  type: WorkflowActionType,
  payload?: Record<string, unknown>,
  description?: string,
): WorkflowAction {
  return {
    type,
    description: description ?? type,
    payload: payload ?? {},
  };
}

/** Adapter tipado para auditoria futura. */
export function createWriteAuditAction(
  payload: Record<string, unknown>,
): WorkflowAction {
  return createAction(
    "WRITE_AUDIT_EVENT",
    payload,
    "Registrar evento de auditoria",
  );
}

let actionSeq = 0;

export function materializePendingActions(input: {
  actions: readonly WorkflowAction[] | null | undefined;
  workflowId: string;
  instanceId: string;
  transition: WorkflowTransition;
  tenantId: string | null;
  at?: string;
}): WorkflowPendingAction[] {
  const list = input.actions ?? [];
  const at = input.at ?? new Date().toISOString();
  const out: WorkflowPendingAction[] = [];

  for (const action of list) {
    if (!isKnownActionType(action.type)) continue;
    actionSeq += 1;
    out.push({
      id: `wfa_${actionSeq}_${Math.random().toString(36).slice(2, 7)}`,
      type: action.type,
      description: action.description ?? action.type,
      payload: action.payload ?? {},
      workflowId: input.workflowId,
      instanceId: input.instanceId,
      transitionId: input.transition.id,
      tenantId: input.tenantId,
      createdAt: at,
      origin: "transition",
    });
  }

  return out;
}

export function __resetActionSeqForTests(): void {
  actionSeq = 0;
}
