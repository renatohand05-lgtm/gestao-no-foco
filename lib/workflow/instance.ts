/**
 * Sprint 21.3 — Instâncias de workflow.
 */

import { createWorkflowContext } from "./context.ts";
import type {
  WorkflowContext,
  WorkflowDefinition,
  WorkflowHistoryEntry,
  WorkflowInstance,
  WorkflowPendingAction,
  WorkflowStatus,
  WorkflowTarget,
} from "./types.ts";

let instanceSeq = 0;

export type CreateInstanceInput = {
  definition: WorkflowDefinition;
  context: WorkflowContext;
  target?: WorkflowTarget | null;
  data?: Record<string, unknown>;
  status?: WorkflowStatus;
  metadata?: Record<string, unknown>;
  id?: string;
  now?: string | Date;
};

export function createWorkflowInstance(
  input: CreateInstanceInput,
): WorkflowInstance {
  instanceSeq += 1;
  const now =
    input.now instanceof Date
      ? input.now.toISOString()
      : typeof input.now === "string"
        ? new Date(input.now).toISOString()
        : new Date().toISOString();

  const context = createWorkflowContext(input.context);
  const tenantId =
    input.definition.tenantScope === "tenant"
      ? (input.definition.tenantId ?? context.tenantId)
      : context.tenantId;

  const history: WorkflowHistoryEntry[] = [
    {
      id: `wfh_${instanceSeq}_0`,
      at: now,
      fromState: null,
      toState: input.definition.initialState,
      event: null,
      transitionId: null,
      actor: context.actor ?? {
        userId: context.userId,
        roles: context.roles,
        permissions: context.permissions,
        type: "system",
      },
      reason: "INSTANCE_CREATED",
      metadata: {},
    },
  ];

  return {
    id: input.id?.trim() || `wfi_${instanceSeq}_${Math.random().toString(36).slice(2, 8)}`,
    workflowId: input.definition.id,
    workflowVersion: input.definition.version,
    tenantId,
    status: input.status ?? "active",
    currentState: input.definition.initialState,
    target: input.target ?? context.target ?? null,
    data: { ...(input.data ?? {}) },
    context,
    history,
    pendingActions: [] as WorkflowPendingAction[],
    createdAt: now,
    updatedAt: now,
    transitionCount: 0,
    metadata: { ...(input.metadata ?? {}) },
  };
}

export function __resetInstanceSeqForTests(): void {
  instanceSeq = 0;
}
