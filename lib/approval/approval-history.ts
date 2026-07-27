/**
 * Sprint 21.4 — Histórico imutável de aprovação.
 */

import type { ApprovalHistoryEntry, ApprovalRequest } from "./types.ts";

export function appendApprovalHistory(
  request: ApprovalRequest,
  entry: Omit<ApprovalHistoryEntry, "id"> & { id?: string },
): ApprovalRequest {
  const id =
    entry.id ??
    `aphr_${request.id}_${request.history.length + 1}_${Date.now()}`;

  const next: ApprovalHistoryEntry = {
    id,
    at: entry.at,
    decision: entry.decision,
    levelId: entry.levelId,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    actor: {
      userId: entry.actor.userId,
      roles: [...entry.actor.roles],
      permissions: [...entry.actor.permissions],
      type: entry.actor.type,
    },
    comment: entry.comment,
    reason: entry.reason,
    metadata: { ...(entry.metadata ?? {}) },
  };

  return {
    ...request,
    history: [...request.history, next],
  };
}

export function listApprovalHistory(
  request: ApprovalRequest,
  direction: "asc" | "desc" = "asc",
): ApprovalHistoryEntry[] {
  const list = [...request.history].sort((a, b) => {
    const ta = new Date(a.at).getTime();
    const tb = new Date(b.at).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
  return direction === "desc" ? list.reverse() : list;
}

export function freezeApprovalHistory(
  entries: readonly ApprovalHistoryEntry[],
): readonly ApprovalHistoryEntry[] {
  return Object.freeze(entries.map((e) => Object.freeze({ ...e })));
}
