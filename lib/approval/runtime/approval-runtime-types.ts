/**
 * Sprint 21.7 — Tipos do Approval Runtime (orquestração · sem duplicar engine).
 */

import type {
  ApprovalDefinition,
  ApprovalDecisionType,
  ApprovalRequest,
  ApprovalRequestStatus,
} from "../types.ts";

export type ApprovalRuntimeOperation =
  | "request"
  | "approve"
  | "reject"
  | "cancel"
  | "expire"
  | "delegate"
  | "escalate"
  | "reopen"
  | "retry"
  | "resolve_next";

export type ApprovalSlaStatus =
  | "on_track"
  | "warning"
  | "overdue"
  | "expired"
  | "completed"
  | "not_applicable";

export type ApprovalSlaSnapshot = {
  createdAt: string;
  startedAt: string | null;
  deadline: string | null;
  expiredAt: string | null;
  remainingMinutes: number | null;
  remainingHours: number | null;
  remainingDays: number | null;
  status: ApprovalSlaStatus;
};

export type ApprovalLevelRuntimeView = {
  levelId: string;
  name: string;
  status: string;
  decision: ApprovalDecisionType | null;
  approver: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMinutes: number | null;
  comments: string | null;
};

export type ApprovalTimelineEventType =
  | "created"
  | "approved"
  | "rejected"
  | "delegated"
  | "escalated"
  | "cancelled"
  | "expired"
  | "reopened"
  | "retry"
  | "returned"
  | "partial";

export type ApprovalTimelineEvent = {
  id: string;
  type: ApprovalTimelineEventType;
  at: string;
  actorId: string | null;
  levelId: string | null;
  comment: string | null;
  metadata: Record<string, unknown>;
  auditLinked: boolean;
};

export type ApprovalRuntimeKpis = {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  escalated: number;
  delegated: number;
  averageApprovalTimeMinutes: number | null;
  averageSlaMinutes: number | null;
  approvalRate: number | null;
  firstPassRate: number | null;
  reopenRate: number | null;
};

export type ApprovalRuntimeFilters = {
  tenantId?: string | null;
  status?: ApprovalRequestStatus | string | null;
  priority?: string | null;
  approverId?: string | null;
  requesterId?: string | null;
  workflowId?: string | null;
  module?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type ApprovalRuntimeResult = {
  ok: boolean;
  request: ApprovalRequest;
  persistedRequestId: string;
  operation: ApprovalRuntimeOperation;
  sla: ApprovalSlaSnapshot;
  timeline: ApprovalTimelineEvent[];
  sideEffects: string[];
  error?: string;
  code?: string;
};

export type ApprovalRuntimeListItem = {
  request: ApprovalRequest;
  definition: ApprovalDefinition | null;
  sla: ApprovalSlaSnapshot;
  summary: ReturnType<typeof import("../approval-timeline.ts").summarizeApproval>;
};

export type DelegateApprovalInput = {
  requestId: string;
  delegateToUserId: string;
  comment?: string | null;
  idempotencyKey?: string;
};

export type EscalateApprovalInput = {
  requestId: string;
  targetLevelId?: string | null;
  reason?: string | null;
  idempotencyKey?: string;
};

export const ESCALATION_PRESETS_HOURS = [24, 48, 72] as const;

export const RUNTIME_DOMAIN_SNAPSHOT_KEY = "runtimeDomainSnapshot";
