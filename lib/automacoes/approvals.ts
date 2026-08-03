/**
 * Sprint 30.7 — Regras de aprovação (puro / server-side ready).
 */

import type { AutomationApproval, AutomationApprovalStatus } from "./types.ts";

export type ApprovalDecisionInput = {
  approval: AutomationApproval;
  actorUserId: string;
  decision: Exclude<
    AutomationApprovalStatus,
    "pending" | "expired"
  >;
  justification?: string | null;
  allowSelfApproval?: boolean;
  nowIso?: string;
  delegateTo?: string | null;
};

export type ApprovalDecisionResult =
  | { ok: true; approval: AutomationApproval }
  | { ok: false; code: string; message: string };

export function canDecideApproval(
  input: ApprovalDecisionInput,
): ApprovalDecisionResult {
  const now = input.nowIso ?? new Date().toISOString();
  const { approval } = input;

  if (approval.status !== "pending" && approval.status !== "delegated") {
    return {
      ok: false,
      code: "ALREADY_DECIDED",
      message: "Aprovação já decidida — dupla aprovação bloqueada.",
    };
  }

  if (approval.expiresAt && Date.parse(approval.expiresAt) < Date.parse(now)) {
    return {
      ok: false,
      code: "EXPIRED",
      message: "Aprovação expirada.",
    };
  }

  if (
    !input.allowSelfApproval &&
    input.actorUserId === approval.requestedBy &&
    (input.decision === "approved" || input.decision === "rejected")
  ) {
    return {
      ok: false,
      code: "SELF_APPROVAL",
      message: "Autoaprovação não permitida.",
    };
  }

  if (input.decision === "delegated" && !input.delegateTo) {
    return {
      ok: false,
      code: "DELEGATE_TARGET",
      message: "Delegação exige destinatário.",
    };
  }

  const next: AutomationApproval = {
    ...approval,
    status: input.decision,
    decidedBy: input.actorUserId,
    decidedAt: now,
    justification: input.justification ?? null,
    history: [
      ...approval.history,
      {
        at: now,
        userId: input.actorUserId,
        decision: input.decision,
        justification: input.justification ?? null,
      },
    ],
  };

  return { ok: true, approval: next };
}

export function executionBlockedWithoutApproval(args: {
  requiresApproval: boolean;
  approvalStatus: AutomationApprovalStatus | null;
}): boolean {
  if (!args.requiresApproval) return false;
  return args.approvalStatus !== "approved";
}
