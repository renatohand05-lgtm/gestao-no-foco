/**
 * Sprint 21.4 — Criação de solicitações de aprovação.
 */

import { createApprovalContext } from "./approval-context.ts";
import {
  requiredApprovalsForLevel,
} from "./approval-level.ts";
import { resolveInitialLevels } from "./approval-policy.ts";
import type {
  ApprovalContext,
  ApprovalDefinition,
  ApprovalLevelProgress,
  ApprovalRequest,
  ApprovalTarget,
} from "./types.ts";

let requestSeq = 0;

export type CreateApprovalRequestInput = {
  definition: ApprovalDefinition;
  context: ApprovalContext;
  target?: ApprovalTarget | null;
  amount?: number | null;
  category?: string | null;
  priority?: string | null;
  tags?: readonly string[];
  metadata?: Record<string, unknown>;
  id?: string;
  now?: string | Date;
};

export function createApprovalRequest(
  input: CreateApprovalRequestInput,
): ApprovalRequest {
  requestSeq += 1;
  const now =
    input.now instanceof Date
      ? input.now.toISOString()
      : typeof input.now === "string"
        ? new Date(input.now).toISOString()
        : new Date().toISOString();

  const context = createApprovalContext({
    ...input.context,
    amount: input.amount ?? input.context.amount,
    category: input.category ?? input.context.category,
    priority: input.priority ?? input.context.priority,
    tags: input.tags ?? input.context.tags,
    target: input.target ?? input.context.target,
  });

  const amount = context.amount;
  const initialLevels = resolveInitialLevels(input.definition, amount);

  const levelProgress: ApprovalLevelProgress[] = input.definition.levels.map(
    (level) => {
      const isCurrent = initialLevels.some((l) => l.id === level.id);
      return {
        levelId: level.id,
        status: isCurrent ? "pending" : "waiting",
        approvals: 0,
        rejections: 0,
        required: requiredApprovalsForLevel(level),
        decidedBy: [],
      };
    },
  );

  const tenantId =
    input.definition.tenantScope === "tenant"
      ? (input.definition.tenantId ?? context.tenantId)
      : context.tenantId;

  return {
    id:
      input.id?.trim() ||
      `appr_${requestSeq}_${Math.random().toString(36).slice(2, 8)}`,
    definitionId: input.definition.id,
    definitionVersion: input.definition.version,
    tenantId,
    status: "pending",
    currentLevelIds: initialLevels.map((l) => l.id),
    levelProgress,
    target: context.target ?? null,
    amount: amount ?? null,
    category: context.category ?? null,
    priority: context.priority ?? null,
    tags: [...(context.tags ?? [])],
    context,
    history: [
      {
        id: `aphr_${requestSeq}_0`,
        at: now,
        decision: null,
        levelId: initialLevels[0]?.id ?? null,
        fromStatus: null,
        toStatus: "pending",
        actor: context.actor ?? {
          userId: context.userId,
          roles: context.roles,
          permissions: context.permissions,
          type: "system",
        },
        comment: null,
        reason: "REQUEST_CREATED",
        metadata: {},
      },
    ],
    pendingActions: [],
    sla: input.definition.sla ?? initialLevels[0]?.sla ?? null,
    createdAt: now,
    updatedAt: now,
    decidedAt: null,
    metadata: { ...(input.metadata ?? {}) },
  };
}

export function __resetApprovalRequestSeqForTests(): void {
  requestSeq = 0;
}
