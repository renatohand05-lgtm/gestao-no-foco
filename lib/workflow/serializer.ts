/**
 * Sprint 21.3 — Serialização JSON segura (sem gravar arquivos).
 */

import { normalizeWorkflowDefinition } from "./definitions.ts";
import { validateWorkflowDefinition } from "./validation.ts";
import type { WorkflowDefinition, WorkflowInstance } from "./types.ts";

export function serializeWorkflowDefinition(
  definition: WorkflowDefinition,
): string {
  return JSON.stringify(definition);
}

export function deserializeWorkflowDefinition(
  json: string,
): WorkflowDefinition {
  const raw = JSON.parse(json) as WorkflowDefinition;
  const def = normalizeWorkflowDefinition({
    ...raw,
    strict: false,
  });
  const validation = validateWorkflowDefinition(def);
  if (!validation.valid) {
    throw new Error(validation.issues[0]?.message ?? "Definição inválida.");
  }
  return def;
}

export function serializeWorkflowInstance(instance: WorkflowInstance): string {
  return JSON.stringify(instance);
}

export function deserializeWorkflowInstance(json: string): WorkflowInstance {
  const raw = JSON.parse(json) as WorkflowInstance;
  if (!raw || typeof raw !== "object" || !raw.id || !raw.workflowId) {
    throw new Error("Instância inválida.");
  }
  return {
    ...raw,
    history: [...(raw.history ?? [])],
    pendingActions: [...(raw.pendingActions ?? [])],
    data: { ...(raw.data ?? {}) },
    metadata: { ...(raw.metadata ?? {}) },
  };
}
