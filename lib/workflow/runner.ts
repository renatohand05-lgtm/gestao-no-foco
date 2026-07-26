/**
 * Sprint 21.3 — Runner: execução controlada de transições (sem persistência).
 */

import { materializePendingActions, createWriteAuditAction } from "./actions.ts";
import { evaluateTransition } from "./engine.ts";
import { appendHistory, freezeHistory } from "./history.ts";
import { findState } from "./states.ts";
import type {
  WorkflowAuditIntent,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStatus,
  WorkflowTransitionResult,
} from "./types.ts";

function resolveStatusAfter(
  definition: WorkflowDefinition,
  toStateId: string,
  actions: readonly { type: string }[],
): WorkflowStatus {
  if (actions.some((a) => a.type === "PAUSE_WORKFLOW")) return "paused";
  if (actions.some((a) => a.type === "COMPLETE_WORKFLOW")) return "completed";

  const state = findState(definition.states, toStateId);
  if (!state) return "active";
  if (state.type === "cancelled" || state.id.includes("cancel")) {
    return "cancelled";
  }
  if (state.type === "failed") return "failed";
  if (state.type === "blocked") return "blocked";
  if (state.isFinal || state.type === "completed") return "completed";
  return "active";
}

export function runTransition(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  event: string,
  context?: WorkflowContext | null,
  options?: { reason?: string; now?: string | Date; metadata?: Record<string, unknown> },
): WorkflowTransitionResult {
  const ctx = context ?? instance.context;
  const decision = evaluateTransition(definition, instance, event, ctx);

  if (!decision.allowed || !decision.transition) {
    return {
      ok: false,
      decision,
      error: decision.message,
      code: decision.reason,
    };
  }

  const transition = decision.transition;
  const now =
    options?.now instanceof Date
      ? options.now.toISOString()
      : typeof options?.now === "string"
        ? new Date(options.now).toISOString()
        : new Date().toISOString();

  const actions = [
    ...(transition.actions ?? []),
    createWriteAuditAction({
      event: "WORKFLOW_TRANSITION_EXECUTED",
      workflowId: definition.id,
      instanceId: instance.id,
      fromState: instance.currentState,
      toState: transition.to,
      transitionId: transition.id,
    }),
  ];

  const pending = materializePendingActions({
    actions,
    workflowId: definition.id,
    instanceId: instance.id,
    transition,
    tenantId: instance.tenantId ?? ctx.tenantId,
    at: now,
  });

  let next: WorkflowInstance = {
    ...instance,
    currentState: transition.to,
    status: resolveStatusAfter(definition, transition.to, actions),
    context: ctx,
    updatedAt: now,
    transitionCount: instance.transitionCount + 1,
    pendingActions: [...instance.pendingActions, ...pending],
    metadata: {
      ...instance.metadata,
      ...(options?.metadata ?? {}),
    },
  };

  next = appendHistory(next, {
    at: now,
    fromState: instance.currentState,
    toState: transition.to,
    event,
    transitionId: transition.id,
    actor: ctx.actor ?? {
      userId: ctx.userId,
      roles: ctx.roles,
      permissions: ctx.permissions,
      type: "user",
    },
    reason: options?.reason ?? decision.reason,
    metadata: {
      ...(options?.metadata ?? {}),
      evaluatedTransitions: [...decision.evaluatedTransitions],
    },
  });

  next = {
    ...next,
    history: freezeHistory(next.history),
  };

  const auditIntent: WorkflowAuditIntent = {
    event: "WORKFLOW_TRANSITION_EXECUTED",
    workflowId: definition.id,
    instanceId: instance.id,
    fromState: instance.currentState,
    toState: transition.to,
    transitionId: transition.id,
    actor: ctx.actor ?? {
      userId: ctx.userId,
      roles: ctx.roles,
      permissions: ctx.permissions,
    },
    tenantId: instance.tenantId ?? ctx.tenantId,
    correlationId: ctx.correlationId,
    metadata: {
      event,
      workflowVersion: definition.version,
    },
  };

  return {
    ok: true,
    instance: next,
    decision,
    pendingActions: pending,
    auditIntent,
  };
}
