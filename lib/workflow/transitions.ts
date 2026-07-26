/**
 * Sprint 21.3 — Helpers de transição.
 */

import type { WorkflowAction, WorkflowCondition, WorkflowTransition } from "./types.ts";

export function createTransition(input: {
  id: string;
  event: string;
  from: string;
  to: string;
  description?: string;
  conditions?: readonly WorkflowCondition[];
  requiredPermissions?: readonly string[];
  requiredRoles?: readonly string[];
  permissionMode?: "any" | "all";
  roleMode?: "any" | "all";
  actions?: readonly WorkflowAction[];
  priority?: number;
  disabled?: boolean;
  metadata?: Record<string, unknown>;
}): WorkflowTransition {
  return {
    id: input.id.trim(),
    event: input.event.trim(),
    from: input.from.trim(),
    to: input.to.trim(),
    description: (input.description ?? "").trim() || `${input.event}: ${input.from} → ${input.to}`,
    conditions: input.conditions ?? [],
    requiredPermissions: input.requiredPermissions ?? [],
    requiredRoles: input.requiredRoles ?? [],
    permissionMode: input.permissionMode ?? "all",
    roleMode: input.roleMode ?? "any",
    actions: input.actions ?? [],
    priority: input.priority ?? 100,
    disabled: input.disabled === true,
    metadata: input.metadata ?? {},
  };
}

export function sortTransitionsByPriority(
  transitions: readonly WorkflowTransition[],
): WorkflowTransition[] {
  return [...transitions].sort((a, b) => {
    const pa = a.priority ?? 100;
    const pb = b.priority ?? 100;
    if (pa !== pb) return pa - pb; // menor = maior prioridade
    return a.id.localeCompare(b.id);
  });
}

export function transitionsForEvent(
  transitions: readonly WorkflowTransition[],
  fromState: string,
  event: string,
): WorkflowTransition[] {
  return sortTransitionsByPriority(
    transitions.filter(
      (t) => t.from === fromState && t.event === event && !t.disabled,
    ),
  );
}
