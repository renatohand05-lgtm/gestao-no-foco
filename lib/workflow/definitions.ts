/**
 * Sprint 21.3 — Criação e normalização de definições.
 */

import { createState } from "./states.ts";
import { createTransition } from "./transitions.ts";
import { validateWorkflowDefinition } from "./validation.ts";
import { InvalidWorkflowDefinitionError } from "./errors.ts";
import type {
  WorkflowDefinition,
  WorkflowState,
  WorkflowTransition,
} from "./types.ts";

export type CreateDefinitionInput = {
  id: string;
  version?: string;
  name: string;
  description?: string;
  tenantScope?: "global" | "tenant";
  tenantId?: string | null;
  initialState: string;
  finalStates: readonly string[];
  states: readonly WorkflowState[];
  transitions: readonly WorkflowTransition[];
  metadata?: Record<string, unknown>;
  /** Se true, lança em definição inválida. */
  strict?: boolean;
};

export function normalizeWorkflowDefinition(
  input: CreateDefinitionInput,
): WorkflowDefinition {
  const states = input.states.map((s) =>
    createState({
      ...s,
      isInitial: s.id === input.initialState || s.isInitial,
      isFinal:
        input.finalStates.includes(s.id) || s.isFinal || s.isTerminal,
    }),
  );

  const transitions = input.transitions.map((t) => createTransition(t));

  const definition: WorkflowDefinition = {
    id: input.id.trim(),
    version: (input.version ?? "1.0.0").trim(),
    name: input.name.trim(),
    description: (input.description ?? "").trim(),
    tenantScope: input.tenantScope ?? "global",
    tenantId:
      input.tenantScope === "tenant"
        ? (input.tenantId?.trim() || null)
        : (input.tenantId?.trim() || null),
    initialState: input.initialState.trim(),
    finalStates: [...new Set(input.finalStates.map((s) => s.trim()))],
    states,
    transitions,
    metadata: input.metadata ?? {},
  };

  const validation = validateWorkflowDefinition(definition);
  if (!validation.valid && input.strict !== false) {
    const first = validation.issues[0]?.message ?? "Definição inválida.";
    throw new InvalidWorkflowDefinitionError(first);
  }

  return definition;
}

export function createWorkflowDefinition(
  input: CreateDefinitionInput,
): WorkflowDefinition {
  return normalizeWorkflowDefinition({ ...input, strict: input.strict ?? true });
}

export function definitionKey(id: string, version: string): string {
  return `${id.trim()}@${version.trim()}`;
}
