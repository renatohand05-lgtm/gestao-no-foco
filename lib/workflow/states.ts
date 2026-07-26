/**
 * Sprint 21.3 — Status e helpers de estado.
 */

import type { WorkflowState, WorkflowStateType, WorkflowStatus } from "./types.ts";

export const WORKFLOW_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
  "failed",
  "blocked",
] as const satisfies readonly WorkflowStatus[];

export const WORKFLOW_STATE_TYPES = [
  "initial",
  "intermediate",
  "approval",
  "waiting",
  "completed",
  "cancelled",
  "failed",
  "blocked",
] as const satisfies readonly WorkflowStateType[];

export const TERMINAL_STATUSES: readonly WorkflowStatus[] = [
  "completed",
  "cancelled",
  "failed",
];

export const BLOCKED_STATUSES: readonly WorkflowStatus[] = [
  "paused",
  "blocked",
  "cancelled",
  "failed",
  "completed",
];

export function isKnownWorkflowStatus(value: string): value is WorkflowStatus {
  return (WORKFLOW_STATUSES as readonly string[]).includes(value);
}

export function isKnownStateType(value: string): value is WorkflowStateType {
  return (WORKFLOW_STATE_TYPES as readonly string[]).includes(value);
}

export function isTerminalStatus(status: WorkflowStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isBlockedStatus(status: WorkflowStatus): boolean {
  return BLOCKED_STATUSES.includes(status);
}

export function isTerminalState(state: WorkflowState | undefined): boolean {
  if (!state) return false;
  return state.isTerminal || state.isFinal;
}

export function findState(
  states: readonly WorkflowState[],
  id: string,
): WorkflowState | undefined {
  return states.find((s) => s.id === id);
}

export function createState(input: {
  id: string;
  name: string;
  description?: string;
  type?: WorkflowStateType;
  isInitial?: boolean;
  isFinal?: boolean;
  isTerminal?: boolean;
  metadata?: Record<string, unknown>;
}): WorkflowState {
  const type = input.type ?? "intermediate";
  const isInitial = input.isInitial === true;
  const isFinal =
    input.isFinal === true ||
    type === "cancelled" ||
    type === "failed";
  const isTerminal =
    input.isTerminal === true ||
    isFinal ||
    (input.isFinal === true && type === "completed");

  return {
    id: input.id.trim(),
    name: input.name.trim() || input.id,
    description: (input.description ?? "").trim(),
    type: isInitial ? "initial" : type,
    isInitial,
    isFinal: input.isFinal === true || isFinal,
    isTerminal: input.isTerminal === true || isTerminal || input.isFinal === true,
    metadata: input.metadata ?? {},
  };
}
