/**
 * Sprint 21.4 — Runner: execução controlada de decisões (sem persistência).
 */

import {
  createNotificationActions,
  createWriteAuditAction,
  isApprovalDecision,
} from "./approval-decision.ts";
import { evaluateApprovalDecision } from "./approval-engine.ts";
import {
  appendApprovalHistory,
  freezeApprovalHistory,
} from "./approval-history.ts";
import { nextSequentialLevels } from "./approval-policy.ts";
import type {
  ApprovalAuditIntent,
  ApprovalContext,
  ApprovalDecisionInput,
  ApprovalDefinition,
  ApprovalLevelProgress,
  ApprovalPendingAction,
  ApprovalRequest,
  ApprovalRequestStatus,
  ApprovalRunResult,
} from "./types.ts";

function toIso(now?: string | Date): string {
  if (now instanceof Date) return now.toISOString();
  if (typeof now === "string") {
    const d = new Date(now);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function updateProgress(
  progress: readonly ApprovalLevelProgress[],
  levelId: string,
  patch: Partial<ApprovalLevelProgress>,
): ApprovalLevelProgress[] {
  return progress.map((p) =>
    p.levelId === levelId
      ? {
          ...p,
          ...patch,
          decidedBy: patch.decidedBy
            ? [...patch.decidedBy]
            : [...p.decidedBy],
        }
      : p,
  );
}

export function runApprovalDecision(
  definition: ApprovalDefinition,
  request: ApprovalRequest,
  input: ApprovalDecisionInput,
  context?: ApprovalContext | null,
): ApprovalRunResult {
  const ctx = context ?? request.context;
  const evaluated = evaluateApprovalDecision(definition, request, input, ctx);

  if (!evaluated.allowed) {
    return {
      ok: false,
      decision: evaluated,
      error: evaluated.message,
      code: evaluated.reason,
    };
  }

  const now = toIso(input.now);
  const fromStatus = request.status;
  let next: ApprovalRequest = { ...request, context: ctx, updatedAt: now };
  let toStatus: ApprovalRequestStatus = request.status;
  const levelId = evaluated.levelId;

  if (
    input.type === "CANCEL" ||
    input.type === "EXPIRE" ||
    input.type === "AUTO_REJECT"
  ) {
    toStatus =
      input.type === "CANCEL"
        ? "cancelled"
        : input.type === "EXPIRE"
          ? "expired"
          : "rejected";
    next = {
      ...next,
      status: toStatus,
      currentLevelIds: [],
      decidedAt: now,
      levelProgress: next.levelProgress.map((p) =>
        p.status === "pending" || p.status === "waiting"
          ? { ...p, status: toStatus === "expired" ? "expired" : "rejected" }
          : p,
      ),
    };
  } else if (input.type === "RETURN_FOR_ADJUSTMENT") {
    toStatus = "returned";
    next = {
      ...next,
      status: toStatus,
      currentLevelIds: [],
      decidedAt: now,
    };
  } else if (input.type === "AUTO_APPROVE") {
    toStatus = "approved";
    next = {
      ...next,
      status: "completed",
      currentLevelIds: [],
      decidedAt: now,
      levelProgress: next.levelProgress.map((p) => ({
        ...p,
        status: "approved",
        approvals: Math.max(p.approvals, p.required),
      })),
    };
    toStatus = "completed";
  } else if (isApprovalDecision(input.type) && levelId) {
    const progress = next.levelProgress.find((p) => p.levelId === levelId)!;
    const decidedBy = ctx.userId
      ? [...new Set([...progress.decidedBy, ctx.userId])]
      : [...progress.decidedBy];
    const approvals = progress.approvals + 1;
    const levelDone = approvals >= progress.required;

    let levelProgress = updateProgress(next.levelProgress, levelId, {
      approvals,
      decidedBy,
      status: levelDone ? "approved" : "pending",
    });

    if (levelDone) {
      const level = definition.levels.find((l) => l.id === levelId)!;
      const remainingCurrent = next.currentLevelIds.filter((id) => id !== levelId);
      const parallelPending = remainingCurrent.filter((id) => {
        const p = levelProgress.find((x) => x.levelId === id);
        return p?.status === "pending";
      });

      if (parallelPending.length > 0) {
        // parallel: wait siblings
        toStatus = "partially_approved";
        next = {
          ...next,
          status: toStatus,
          currentLevelIds: parallelPending,
          levelProgress,
        };
      } else {
        const following = nextSequentialLevels(definition, levelId);
        if (following.length > 0) {
          toStatus = "pending";
          levelProgress = levelProgress.map((p) => {
            if (following.some((f) => f.id === p.levelId)) {
              return { ...p, status: "pending" as const };
            }
            return p;
          });
          next = {
            ...next,
            status: toStatus,
            currentLevelIds: following.map((f) => f.id),
            levelProgress,
          };
        } else {
          toStatus = "completed";
          next = {
            ...next,
            status: toStatus,
            currentLevelIds: [],
            decidedAt: now,
            levelProgress,
          };
        }
      }

      // silence unused — level used for potential mixed mode future
      void level;
    } else {
      toStatus = "partially_approved";
      next = {
        ...next,
        status: toStatus,
        levelProgress,
      };
    }
  } else if (input.type === "REJECT" && levelId) {
    toStatus = "rejected";
    next = {
      ...next,
      status: toStatus,
      currentLevelIds: [],
      decidedAt: now,
      levelProgress: updateProgress(next.levelProgress, levelId, {
        rejections: (
          next.levelProgress.find((p) => p.levelId === levelId)?.rejections ?? 0
        ) + 1,
        status: "rejected",
        decidedBy: ctx.userId
          ? [
              ...new Set([
                ...(next.levelProgress.find((p) => p.levelId === levelId)
                  ?.decidedBy ?? []),
                ctx.userId,
              ]),
            ]
          : next.levelProgress.find((p) => p.levelId === levelId)?.decidedBy ??
            [],
      }),
    };
  } else {
    return {
      ok: false,
      decision: {
        allowed: false,
        reason: "DENY_BY_DEFAULT",
        message: "Decisão não aplicada.",
        levelId,
      },
      error: "Decisão não aplicada.",
      code: "DENY_BY_DEFAULT",
    };
  }

  next = appendApprovalHistory(next, {
    at: now,
    decision: input.type,
    levelId,
    fromStatus,
    toStatus: next.status,
    actor: ctx.actor ?? {
      userId: ctx.userId,
      roles: ctx.roles,
      permissions: ctx.permissions,
      type: "user",
    },
    comment: input.comment ?? null,
    reason: input.reason ?? evaluated.reason,
    metadata: { ...(input.metadata ?? {}) },
  });

  const actionMeta = {
    requestId: next.id,
    definitionId: definition.id,
    tenantId: next.tenantId ?? ctx.tenantId,
    at: now,
  };

  const pending: ApprovalPendingAction[] = [
    createWriteAuditAction(
      {
        event: "APPROVAL_DECISION_EXECUTED",
        decision: input.type,
        levelId,
        fromStatus,
        toStatus: next.status,
      },
      actionMeta,
    ),
    ...createNotificationActions(actionMeta, {
      decision: input.type,
      status: next.status,
    }),
  ];

  if (ctx.workflowInstanceId) {
    pending.push({
      id: `apa_wf_${Date.now()}`,
      type: "EMIT_WORKFLOW_EVENT",
      description: "Emitir evento de workflow",
      payload: {
        workflowInstanceId: ctx.workflowInstanceId,
        decision: input.type,
        status: next.status,
      },
      requestId: next.id,
      definitionId: definition.id,
      tenantId: next.tenantId,
      createdAt: now,
      origin: "decision",
    });
  }

  next = {
    ...next,
    pendingActions: [...next.pendingActions, ...pending],
    history: freezeApprovalHistory(next.history),
  };

  const auditIntent: ApprovalAuditIntent = {
    event: "APPROVAL_DECISION_EXECUTED",
    definitionId: definition.id,
    requestId: next.id,
    decision: input.type,
    levelId,
    fromStatus,
    toStatus: next.status,
    actor: ctx.actor ?? {
      userId: ctx.userId,
      roles: ctx.roles,
      permissions: ctx.permissions,
    },
    tenantId: next.tenantId ?? ctx.tenantId,
    correlationId: ctx.correlationId,
    metadata: {
      definitionVersion: definition.version,
      amount: next.amount,
    },
  };

  return {
    ok: true,
    request: next,
    decision: evaluated,
    pendingActions: pending,
    auditIntent,
  };
}
