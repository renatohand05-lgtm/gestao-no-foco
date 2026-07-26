/**
 * Sprint 21.3 — Engine central de avaliação de transições (deny-by-default).
 */

import { evaluateConditions } from "./conditions.ts";
import { isValidWorkflowContext } from "./context.ts";
import { findState, isBlockedStatus, isTerminalState } from "./states.ts";
import { sortTransitionsByPriority } from "./transitions.ts";
import type {
  WorkflowContext,
  WorkflowDecision,
  WorkflowDecisionReason,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowTransition,
} from "./types.ts";

const SAFE: Record<WorkflowDecisionReason, string> = {
  ALLOWED: "Transição permitida.",
  DENY_BY_DEFAULT: "Nenhuma transição válida para este evento.",
  DEFINITION_NOT_FOUND: "Definição de workflow não encontrada.",
  INSTANCE_INVALID: "Instância de workflow inválida.",
  STATE_MISMATCH: "Estado atual não corresponde à transição.",
  EVENT_NOT_FOUND: "Evento não encontrado para o estado atual.",
  TRANSITION_DISABLED: "Transição desabilitada.",
  CONDITION_FAILED: "Condições da transição não satisfeitas.",
  PERMISSION_DENIED: "Permissões insuficientes.",
  ROLE_DENIED: "Papel insuficiente.",
  TENANT_MISMATCH: "Tenant divergente.",
  MISSING_TENANT: "Tenant ausente.",
  TERMINAL_STATE: "Workflow em estado terminal.",
  STATUS_BLOCKED: "Status do workflow não permite transição.",
  INVALID_CONTEXT: "Contexto de workflow inválido.",
};

function decision(
  partial: Omit<WorkflowDecision, "message"> & { message?: string },
): WorkflowDecision {
  return {
    ...partial,
    message: partial.message ?? SAFE[partial.reason],
  };
}

function checkTenant(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  context: WorkflowContext,
): WorkflowDecision | null {
  if (definition.tenantScope === "tenant") {
    const defTenant = definition.tenantId?.trim() || null;
    if (!defTenant) {
      return decision({
        allowed: false,
        reason: "MISSING_TENANT",
        transition: null,
        evaluatedTransitions: [],
      });
    }
    if (!context.tenantId?.trim()) {
      return decision({
        allowed: false,
        reason: "MISSING_TENANT",
        transition: null,
        evaluatedTransitions: [],
      });
    }
    if (context.tenantId !== defTenant) {
      return decision({
        allowed: false,
        reason: "TENANT_MISMATCH",
        transition: null,
        evaluatedTransitions: [],
      });
    }
    if (instance.tenantId && instance.tenantId !== defTenant) {
      return decision({
        allowed: false,
        reason: "TENANT_MISMATCH",
        transition: null,
        evaluatedTransitions: [],
      });
    }
  } else {
    // global definition still requires tenant on instance execution context
    if (!context.tenantId?.trim()) {
      return decision({
        allowed: false,
        reason: "MISSING_TENANT",
        transition: null,
        evaluatedTransitions: [],
      });
    }
    if (instance.tenantId && instance.tenantId !== context.tenantId) {
      return decision({
        allowed: false,
        reason: "TENANT_MISMATCH",
        transition: null,
        evaluatedTransitions: [],
      });
    }
  }
  return null;
}

function checkRoles(
  transition: WorkflowTransition,
  context: WorkflowContext,
): boolean {
  const required = transition.requiredRoles ?? [];
  if (required.length === 0) return true;
  const mode = transition.roleMode ?? "any";
  const roles = context.roles ?? [];
  if (mode === "all") return required.every((r) => roles.includes(r));
  return required.some((r) => roles.includes(r));
}

function checkPermissions(
  transition: WorkflowTransition,
  context: WorkflowContext,
): boolean {
  const required = transition.requiredPermissions ?? [];
  if (required.length === 0) return true;
  const mode = transition.permissionMode ?? "all";
  const perms = context.permissions ?? [];
  if (mode === "any") return required.some((p) => perms.includes(p));
  return required.every((p) => perms.includes(p));
}

function evaluateSingle(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  context: WorkflowContext,
  transition: WorkflowTransition,
): WorkflowDecision {
  if (transition.disabled) {
    return decision({
      allowed: false,
      reason: "TRANSITION_DISABLED",
      transition,
      evaluatedTransitions: [transition.id],
    });
  }

  if (transition.from !== instance.currentState) {
    return decision({
      allowed: false,
      reason: "STATE_MISMATCH",
      transition,
      evaluatedTransitions: [transition.id],
    });
  }

  if (!checkRoles(transition, context)) {
    return decision({
      allowed: false,
      reason: "ROLE_DENIED",
      transition,
      evaluatedTransitions: [transition.id],
    });
  }

  if (!checkPermissions(transition, context)) {
    return decision({
      allowed: false,
      reason: "PERMISSION_DENIED",
      transition,
      evaluatedTransitions: [transition.id],
    });
  }

  const okConditions = evaluateConditions(transition.conditions, {
    context,
    instance,
  });
  if (!okConditions) {
    return decision({
      allowed: false,
      reason: "CONDITION_FAILED",
      transition,
      evaluatedTransitions: [transition.id],
    });
  }

  if (!findState(definition.states, transition.to)) {
    return decision({
      allowed: false,
      reason: "DENY_BY_DEFAULT",
      transition,
      evaluatedTransitions: [transition.id],
    });
  }

  return decision({
    allowed: true,
    reason: "ALLOWED",
    transition,
    evaluatedTransitions: [transition.id],
  });
}

export function evaluateTransition(
  definition: WorkflowDefinition | null | undefined,
  instance: WorkflowInstance | null | undefined,
  event: string | null | undefined,
  context?: WorkflowContext | null,
): WorkflowDecision {
  if (!definition) {
    return decision({
      allowed: false,
      reason: "DEFINITION_NOT_FOUND",
      transition: null,
      evaluatedTransitions: [],
    });
  }
  if (!instance || !instance.id || !instance.currentState) {
    return decision({
      allowed: false,
      reason: "INSTANCE_INVALID",
      transition: null,
      evaluatedTransitions: [],
    });
  }

  const ctx = context ?? instance.context;
  if (!isValidWorkflowContext(ctx)) {
    return decision({
      allowed: false,
      reason: "INVALID_CONTEXT",
      transition: null,
      evaluatedTransitions: [],
    });
  }

  const tenantDeny = checkTenant(definition, instance, ctx);
  if (tenantDeny) return tenantDeny;

  if (isBlockedStatus(instance.status)) {
    const reason: WorkflowDecisionReason =
      instance.status === "completed" ||
      instance.status === "cancelled" ||
      instance.status === "failed"
        ? "TERMINAL_STATE"
        : "STATUS_BLOCKED";
    return decision({
      allowed: false,
      reason,
      transition: null,
      evaluatedTransitions: [],
    });
  }

  const current = findState(definition.states, instance.currentState);
  if (isTerminalState(current)) {
    return decision({
      allowed: false,
      reason: "TERMINAL_STATE",
      transition: null,
      evaluatedTransitions: [],
    });
  }

  const ev = typeof event === "string" ? event.trim() : "";
  if (!ev) {
    return decision({
      allowed: false,
      reason: "EVENT_NOT_FOUND",
      transition: null,
      evaluatedTransitions: [],
    });
  }

  const candidates = sortTransitionsByPriority(
    definition.transitions.filter(
      (t) => t.from === instance.currentState && t.event === ev,
    ),
  );

  if (candidates.length === 0) {
    return decision({
      allowed: false,
      reason: "EVENT_NOT_FOUND",
      transition: null,
      evaluatedTransitions: [],
    });
  }

  const evaluated: string[] = [];
  for (const transition of candidates) {
    const result = evaluateSingle(definition, instance, ctx, transition);
    evaluated.push(transition.id);
    if (result.allowed) {
      return decision({
        ...result,
        evaluatedTransitions: evaluated,
      });
    }
  }

  // última negação com contexto
  const last = evaluateSingle(
    definition,
    instance,
    ctx,
    candidates[candidates.length - 1],
  );

  return decision({
    allowed: false,
    reason: last.reason === "ALLOWED" ? "DENY_BY_DEFAULT" : last.reason,
    transition: last.transition,
    evaluatedTransitions: evaluated,
    message: last.message,
  });
}

export function canTransition(
  definition: WorkflowDefinition | null | undefined,
  instance: WorkflowInstance | null | undefined,
  event: string | null | undefined,
  context?: WorkflowContext | null,
): boolean {
  return evaluateTransition(definition, instance, event, context).allowed;
}

export function cannotTransition(
  definition: WorkflowDefinition | null | undefined,
  instance: WorkflowInstance | null | undefined,
  event: string | null | undefined,
  context?: WorkflowContext | null,
): boolean {
  return !canTransition(definition, instance, event, context);
}

export function explainTransition(
  definition: WorkflowDefinition | null | undefined,
  instance: WorkflowInstance | null | undefined,
  event: string | null | undefined,
  context?: WorkflowContext | null,
): WorkflowDecision {
  return evaluateTransition(definition, instance, event, context);
}

export function getAvailableTransitions(
  definition: WorkflowDefinition,
  instance: WorkflowInstance,
  context?: WorkflowContext | null,
): WorkflowTransition[] {
  const ctx = context ?? instance.context;
  const from = instance.currentState;
  const uniqueEvents = [
    ...new Set(
      definition.transitions
        .filter((t) => t.from === from && !t.disabled)
        .map((t) => t.event),
    ),
  ].sort();

  const available: WorkflowTransition[] = [];
  for (const event of uniqueEvents) {
    const decisionResult = evaluateTransition(definition, instance, event, ctx);
    if (decisionResult.allowed && decisionResult.transition) {
      available.push(decisionResult.transition);
    }
  }
  return sortTransitionsByPriority(available);
}
