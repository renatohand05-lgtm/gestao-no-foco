/**
 * Sprint 21.7 — Utilitários: SLA, mappers, timeline, KPIs.
 */

import { listApprovalHistory } from "../approval-history.ts";
import { summarizeApproval } from "../approval-timeline.ts";
import {
  deserializeApprovalRequest,
  serializeApprovalRequest,
} from "../approval-serializer.ts";
import { createApprovalRequest } from "../approval-request.ts";
import type {
  ApprovalDefinition,
  ApprovalHistoryEntry,
  ApprovalRequest,
  ApprovalSlaConfig,
} from "../types.ts";
import type { PersistedApprovalRequest } from "../../enterprise/repositories/contracts.ts";
import type { JsonValue } from "../../enterprise/types.ts";
import {
  RUNTIME_DOMAIN_SNAPSHOT_KEY,
  type ApprovalLevelRuntimeView,
  type ApprovalRuntimeFilters,
  type ApprovalRuntimeKpis,
  type ApprovalRuntimeListItem,
  type ApprovalSlaSnapshot,
  type ApprovalSlaStatus,
  type ApprovalTimelineEvent,
  type ApprovalTimelineEventType,
} from "./approval-runtime-types.ts";

function toIso(value?: string | Date | null): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function minutesBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 60_000));
}

export function computeApprovalSla(
  request: ApprovalRequest,
  now: string | Date = new Date(),
): ApprovalSlaSnapshot {
  const at = toIso(now);
  const sla: ApprovalSlaConfig | null =
    request.sla ??
    request.metadata?.sla ??
    null;

  const createdAt = request.createdAt;
  const startedAt =
    request.history.find((h) => h.toStatus === "pending")?.at ?? createdAt;

  let deadline: string | null = null;
  if (sla?.expireAfterMinutes && startedAt) {
    const d = new Date(startedAt);
    d.setMinutes(d.getMinutes() + sla.expireAfterMinutes);
    deadline = d.toISOString();
  } else if (sla?.maxMinutes && startedAt) {
    const d = new Date(startedAt);
    d.setMinutes(d.getMinutes() + sla.maxMinutes);
    deadline = d.toISOString();
  }

  const expiredAt =
    request.status === "expired" ? (request.decidedAt ?? at) : null;

  let remainingMinutes: number | null = null;
  if (deadline && !request.decidedAt) {
    remainingMinutes = minutesBetween(at, deadline);
    if (new Date(at) > new Date(deadline)) remainingMinutes = 0;
  }

  let status: ApprovalSlaStatus = "not_applicable";
  if (request.status === "completed" || request.status === "approved") {
    status = "completed";
  } else if (request.status === "expired") {
    status = "expired";
  } else if (deadline) {
    const overdue = new Date(at) > new Date(deadline);
    if (overdue) status = "overdue";
    else if (
      sla?.alertAfterMinutes &&
      minutesBetween(startedAt, at) >= sla.alertAfterMinutes
    ) {
      status = "warning";
    } else {
      status = "on_track";
    }
  }

  const remainingHours =
    remainingMinutes != null ? Math.floor(remainingMinutes / 60) : null;
  const remainingDays =
    remainingHours != null ? Math.floor(remainingHours / 24) : null;

  return {
    createdAt,
    startedAt,
    deadline,
    expiredAt,
    remainingMinutes,
    remainingHours,
    remainingDays,
    status,
  };
}

export function shouldEscalateBySla(
  request: ApprovalRequest,
  now: string | Date = new Date(),
): boolean {
  const sla = computeApprovalSla(request, now);
  if (sla.status !== "overdue" && sla.status !== "warning") return false;
  const config: ApprovalSlaConfig | null = request.sla ?? null;
  if (!config?.escalateAfterMinutes || !sla.startedAt) return sla.status === "overdue";
  return (
    minutesBetween(sla.startedAt, toIso(now)) >= config.escalateAfterMinutes
  );
}

export function mapHistoryToTimelineEvent(
  entry: ApprovalHistoryEntry,
): ApprovalTimelineEvent {
  const decision = entry.decision;
  let type: ApprovalTimelineEventType = "partial";
  if (!decision && entry.reason === "REQUEST_CREATED") type = "created";
  else if (decision === "APPROVE") type = "approved";
  else if (decision === "REJECT") type = "rejected";
  else if (decision === "CANCEL") type = "cancelled";
  else if (decision === "EXPIRE") type = "expired";
  else if (decision === "RETURN_FOR_ADJUSTMENT") type = "returned";
  else if (entry.metadata?.delegated === true) type = "delegated";
  else if (entry.metadata?.escalated === true) type = "escalated";
  else if (entry.metadata?.reopened === true) type = "reopened";
  else if (entry.metadata?.retry === true) type = "retry";

  return {
    id: entry.id,
    type,
    at: entry.at,
    actorId: entry.actor.userId,
    levelId: entry.levelId,
    comment: entry.comment,
    metadata: { ...entry.metadata },
    auditLinked: true,
  };
}

export function buildApprovalTimeline(
  request: ApprovalRequest,
): ApprovalTimelineEvent[] {
  return listApprovalHistory(request, "asc").map(mapHistoryToTimelineEvent);
}

export function buildLevelRuntimeViews(
  request: ApprovalRequest,
  definition: ApprovalDefinition | null,
): ApprovalLevelRuntimeView[] {
  return request.levelProgress.map((progress) => {
    const level = definition?.levels.find((l) => l.id === progress.levelId);
    const history = listApprovalHistory(request, "asc").filter(
      (h) => h.levelId === progress.levelId,
    );
    const first = history[0] ?? null;
    const last = history[history.length - 1] ?? null;
    const decisionEntry = [...history].reverse().find((h) => h.decision);
    return {
      levelId: progress.levelId,
      name: level?.name ?? progress.levelId,
      status: progress.status,
      decision: decisionEntry?.decision ?? null,
      approver: progress.decidedBy[progress.decidedBy.length - 1] ?? null,
      startedAt: first?.at ?? null,
      finishedAt:
        progress.status === "approved" || progress.status === "rejected"
          ? (last?.at ?? null)
          : null,
      durationMinutes:
        first?.at && last?.at ? minutesBetween(first.at, last.at) : null,
      comments: last?.comment ?? null,
    };
  });
}

export function toDomainApprovalRequest(
  persisted: PersistedApprovalRequest,
  definition: ApprovalDefinition,
): ApprovalRequest {
  const snap = persisted.metadata?.[RUNTIME_DOMAIN_SNAPSHOT_KEY];
  if (typeof snap === "string") {
    return deserializeApprovalRequest(snap);
  }
  if (snap && typeof snap === "object") {
    return deserializeApprovalRequest(JSON.stringify(snap));
  }

  return createApprovalRequest({
    definition,
    id: persisted.id,
    amount: persisted.amount,
    category: (persisted.metadata?.category as string) ?? null,
    priority: (persisted.metadata?.priority as string) ?? null,
    context: {
      tenantId: persisted.tenantId,
      userId: persisted.requesterId,
      roles: [],
      permissions: [],
      variables: {},
      metadata: {},
      correlationId: persisted.correlationId,
      requestId: null,
      target: persisted.targetType
        ? { type: persisted.targetType, id: persisted.targetId }
        : null,
    },
    metadata: { ...(persisted.metadata as Record<string, unknown>) },
    now: persisted.createdAt,
  });
}

export function toPersistedPatchFromDomain(
  persisted: PersistedApprovalRequest,
  domain: ApprovalRequest,
): Partial<PersistedApprovalRequest> {
  const metadata: Record<string, JsonValue> = {
    ...persisted.metadata,
    [RUNTIME_DOMAIN_SNAPSHOT_KEY]: serializeApprovalRequest(domain),
    category: domain.category,
    priority: domain.priority,
  };

  return {
    status: domain.status,
    currentLevel: domain.currentLevelIds[0] ?? null,
    amount: domain.amount,
    completedAt: domain.decidedAt,
    expiresAt:
      domain.sla?.expireAfterMinutes && domain.createdAt
        ? new Date(
            new Date(domain.createdAt).getTime() +
              domain.sla.expireAfterMinutes * 60_000,
          ).toISOString()
        : persisted.expiresAt,
    metadata,
    updatedAt: domain.updatedAt,
  };
}

export function computeApprovalKpis(
  items: ApprovalRuntimeListItem[],
): ApprovalRuntimeKpis {
  const pending = items.filter((i) =>
    ["pending", "partially_approved", "waiting", "requested"].includes(
      i.request.status,
    ),
  ).length;
  const approved = items.filter(
    (i) => i.request.status === "completed" || i.request.status === "approved",
  ).length;
  const rejected = items.filter((i) => i.request.status === "rejected").length;
  const expired = items.filter((i) => i.request.status === "expired").length;
  const escalated = items.filter((i) =>
    i.request.history.some((h) => h.metadata?.escalated === true),
  ).length;
  const delegated = items.filter((i) =>
    i.request.history.some((h) => h.metadata?.delegated === true),
  ).length;

  const completed = items.filter((i) => i.request.decidedAt);
  const durations = completed.map((i) =>
    minutesBetween(i.request.createdAt, i.request.decidedAt!),
  );
  const averageApprovalTimeMinutes =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  const slaTargets = items
    .map((i) => i.definition?.sla?.maxMinutes ?? i.definition?.sla?.expireAfterMinutes)
    .filter((v): v is number => typeof v === "number");
  const averageSlaMinutes =
    slaTargets.length > 0
      ? Math.round(slaTargets.reduce((a, b) => a + b, 0) / slaTargets.length)
      : null;

  const totalDecided = approved + rejected;
  const approvalRate =
    totalDecided > 0 ? Math.round((approved / totalDecided) * 100) / 100 : null;

  const firstPass = items.filter(
    (i) =>
      (i.request.status === "completed" || i.request.status === "approved") &&
      i.request.levelProgress.filter((p) => p.rejections > 0).length === 0,
  ).length;
  const firstPassRate =
    approved > 0 ? Math.round((firstPass / approved) * 100) / 100 : null;

  const reopened = items.filter((i) =>
    i.request.history.some((h) => h.metadata?.reopened === true),
  ).length;
  const reopenRate =
    items.length > 0 ? Math.round((reopened / items.length) * 100) / 100 : null;

  return {
    pending,
    approved,
    rejected,
    expired,
    escalated,
    delegated,
    averageApprovalTimeMinutes,
    averageSlaMinutes,
    approvalRate,
    firstPassRate,
    reopenRate,
  };
}

export function filterRuntimeItems(
  items: ApprovalRuntimeListItem[],
  filters: ApprovalRuntimeFilters,
): ApprovalRuntimeListItem[] {
  return items.filter((item) => {
    if (filters.tenantId && item.request.tenantId !== filters.tenantId) {
      return false;
    }
    if (filters.status && item.request.status !== filters.status) return false;
    if (filters.priority && item.request.priority !== filters.priority) {
      return false;
    }
    if (
      filters.approverId &&
      !item.request.levelProgress.some((p) =>
        p.decidedBy.includes(filters.approverId!),
      )
    ) {
      return false;
    }
    if (
      filters.requesterId &&
      item.request.context.userId !== filters.requesterId
    ) {
      return false;
    }
    if (
      filters.workflowId &&
      item.request.context.workflowId !== filters.workflowId
    ) {
      return false;
    }
    if (filters.module && item.request.category !== filters.module) {
      return false;
    }
    if (filters.dateFrom && item.request.createdAt < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && item.request.createdAt > filters.dateTo) {
      return false;
    }
    return true;
  });
}

export function resolveNextStep(request: ApprovalRequest): {
  levelId: string | null;
  status: string;
  action: "wait" | "decide" | "complete";
} {
  const summary = summarizeApproval(request);
  if (request.status === "completed" || request.status === "cancelled") {
    return { levelId: null, status: request.status, action: "complete" };
  }
  const nextLevel = summary.currentLevels[0] ?? null;
  return {
    levelId: nextLevel,
    status: request.status,
    action: nextLevel ? "decide" : "wait",
  };
}
