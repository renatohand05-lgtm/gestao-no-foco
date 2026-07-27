/**
 * Sprint 21.4 — Timeline de aprovação.
 */

import { listApprovalHistory } from "./approval-history.ts";
import type { ApprovalHistoryEntry, ApprovalRequest } from "./types.ts";

export type ApprovalTimelineGroup = {
  key: string;
  label: string;
  count: number;
  entries: readonly ApprovalHistoryEntry[];
};

export function groupApprovalHistoryByLevel(
  request: ApprovalRequest,
): ApprovalTimelineGroup[] {
  const map = new Map<string, ApprovalHistoryEntry[]>();
  for (const entry of listApprovalHistory(request, "asc")) {
    const key = entry.levelId ?? "system";
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }
  return [...map.entries()].map(([key, entries]) => ({
    key,
    label: key,
    count: entries.length,
    entries,
  }));
}

export function groupApprovalHistoryByDecision(
  request: ApprovalRequest,
): ApprovalTimelineGroup[] {
  const map = new Map<string, ApprovalHistoryEntry[]>();
  for (const entry of listApprovalHistory(request, "asc")) {
    const key = entry.decision ?? "NONE";
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }
  return [...map.entries()].map(([key, entries]) => ({
    key,
    label: key,
    count: entries.length,
    entries,
  }));
}

export function summarizeApproval(request: ApprovalRequest): {
  status: string;
  currentLevels: readonly string[];
  approvedLevels: number;
  pendingLevels: number;
  decisionCount: number;
  lastDecision: string | null;
  lastAt: string | null;
} {
  const history = listApprovalHistory(request, "asc");
  const last = history[history.length - 1] ?? null;
  const approvedLevels = request.levelProgress.filter(
    (p) => p.status === "approved",
  ).length;
  const pendingLevels = request.levelProgress.filter(
    (p) => p.status === "pending" || p.status === "waiting",
  ).length;

  return {
    status: request.status,
    currentLevels: request.currentLevelIds,
    approvedLevels,
    pendingLevels,
    decisionCount: history.filter((h) => h.decision).length,
    lastDecision: last?.decision ?? null,
    lastAt: last?.at ?? null,
  };
}

export function approvalProgressPercent(request: ApprovalRequest): number {
  const total = request.levelProgress.length;
  if (total === 0) return 0;
  const done = request.levelProgress.filter(
    (p) =>
      p.status === "approved" ||
      p.status === "rejected" ||
      p.status === "skipped" ||
      p.status === "expired",
  ).length;
  return Math.round((done / total) * 100);
}
