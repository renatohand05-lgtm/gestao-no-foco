/**
 * Sprint 21.8 — Mappers: Audit / Workflow / Approval / Notifications / Outbox → TimelineEvent.
 */

import type {
  PersistedApprovalDecision,
  PersistedApprovalRequest,
  PersistedAuditEvent,
  PersistedNotification,
  PersistedWorkflowHistory,
  PersistedWorkflowInstance,
} from "../enterprise/repositories/contracts.ts";
import type { EnterpriseOutboxEvent } from "../enterprise/types.ts";
import type {
  TimelineEntityType,
  TimelineEvent,
  TimelineSeverity,
  TimelineSource,
} from "./timeline-types.ts";

const SOURCE_COLOR: Record<TimelineSource, string> = {
  audit: "#475569",
  workflow: "#2563eb",
  approval: "#7c3aed",
  notifications: "#0891b2",
  outbox: "#ca8a04",
  erp: "#059669",
};

const SOURCE_ICON: Record<TimelineSource, string> = {
  audit: "shield",
  workflow: "git-branch",
  approval: "check-circle",
  notifications: "bell",
  outbox: "inbox",
  erp: "box",
};

function severityOf(value: string | null | undefined): TimelineSeverity {
  const v = (value ?? "").toLowerCase();
  if (v === "critical" || v === "critico" || v === "error") return "critical";
  if (v === "high" || v === "alto") return "high";
  if (v === "medium" || v === "medio" || v === "warning") return "medium";
  if (v === "low" || v === "baixo") return "low";
  if (v === "info" || v === "information") return "info";
  return "unknown";
}

function entityTypeFrom(targetType: string | null | undefined): TimelineEntityType {
  const t = (targetType ?? "").toLowerCase();
  if (["cliente", "client", "customer"].includes(t)) return "cliente";
  if (["fornecedor", "supplier", "vendor"].includes(t)) return "fornecedor";
  if (["os", "ordem", "ordem_servico", "work_order"].includes(t)) return "os";
  if (["venda", "sale", "sales"].includes(t)) return "venda";
  if (["conta", "account", "financeiro"].includes(t)) return "conta";
  if (["produto", "product", "estoque"].includes(t)) return "produto";
  if (["usuario", "user", "profile"].includes(t)) return "usuario";
  if (["funcionario", "employee", "mecanico"].includes(t)) return "funcionario";
  if (["aprovacao", "approval", "approval_request"].includes(t)) return "aprovacao";
  if (["workflow", "workflow_instance"].includes(t)) return "workflow";
  if (["notification"].includes(t)) return "notification";
  if (["outbox"].includes(t)) return "outbox";
  if (["audit", "audit_event"].includes(t)) return "audit";
  return "generic";
}

function isErpModule(module: string | null | undefined): boolean {
  const m = (module ?? "").toLowerCase();
  return [
    "clientes",
    "vendas",
    "estoque",
    "financeiro",
    "ordens",
    "produtos",
    "oficina",
    "crm",
    "descontos",
  ].includes(m);
}

function baseEvent(partial: Omit<TimelineEvent, "color" | "icon" | "actorName" | "actorAvatar" | "tags"> & {
  tags?: string[];
}): TimelineEvent {
  return {
    ...partial,
    actorName: partial.actor.name,
    actorAvatar: partial.actor.avatar,
    color: SOURCE_COLOR[partial.source],
    icon: SOURCE_ICON[partial.source],
    tags: partial.tags ?? [partial.source, partial.module].filter(Boolean) as string[],
  };
}

export function mapAuditToTimelineEvent(row: PersistedAuditEvent): TimelineEvent {
  const erp = isErpModule(row.module);
  const source: TimelineSource = erp ? "erp" : "audit";
  return baseEvent({
    id: `audit:${row.id}`,
    tenantId: row.tenantId,
    entityType: entityTypeFrom(row.targetType),
    entityId: row.targetId,
    module: row.module ?? (erp ? row.module : "audit"),
    category: row.category,
    title: row.event,
    description: row.description,
    status: null,
    severity: severityOf(row.severity),
    actor: {
      id: row.userId ?? row.systemActorKey,
      name: row.userId ?? row.systemActorKey,
      avatar: null,
      type: row.actorType,
    },
    createdAt: row.createdAt,
    metadata: { ...row.metadata, origin: row.origin, requestId: row.requestId },
    source,
    link: null,
    correlationId: row.correlationId,
    tags: [source, row.category, row.module].filter(Boolean) as string[],
  });
}

export function mapWorkflowHistoryToTimelineEvent(
  row: PersistedWorkflowHistory,
  instance?: PersistedWorkflowInstance | null,
): TimelineEvent {
  return baseEvent({
    id: `workflow:${row.id}`,
    tenantId: row.tenantId,
    entityType: "workflow",
    entityId: row.workflowInstanceId,
    module: "workflow",
    category: "workflow",
    title: row.event,
    description: row.reason ?? `${row.fromState ?? "—"} → ${row.toState}`,
    status: instance?.status ?? null,
    severity: "info",
    actor: {
      id: row.actorId ?? row.systemActorKey,
      name: row.actorId ?? row.systemActorKey,
      avatar: null,
      type: row.actorType,
    },
    createdAt: row.createdAt,
    metadata: {
      ...row.metadata,
      fromState: row.fromState,
      toState: row.toState,
      workflowKey: instance?.workflowKey ?? null,
    },
    source: "workflow",
    link: null,
    correlationId: row.correlationId,
  });
}

export function mapApprovalDecisionToTimelineEvent(
  decision: PersistedApprovalDecision,
  request?: PersistedApprovalRequest | null,
): TimelineEvent {
  return baseEvent({
    id: `approval:${decision.id}`,
    tenantId: decision.tenantId,
    entityType: "aprovacao",
    entityId: decision.approvalRequestId,
    module: "approval",
    category: "approval",
    title: decision.decision,
    description: decision.reason ?? request?.approvalKey ?? null,
    status: request?.status ?? null,
    severity:
      decision.decision === "REJECT" || decision.decision === "EXPIRE"
        ? "high"
        : "info",
    actor: {
      id: decision.approverId ?? decision.approverSystemKey,
      name: decision.approverId ?? decision.approverSystemKey,
      avatar: null,
      type: decision.approverActorType,
    },
    createdAt: decision.createdAt,
    metadata: {
      ...decision.metadata,
      levelId: decision.levelId,
      approvalKey: request?.approvalKey ?? null,
    },
    source: "approval",
    link: null,
    correlationId: decision.correlationId,
  });
}

export function mapApprovalRequestToTimelineEvent(
  request: PersistedApprovalRequest,
): TimelineEvent {
  return baseEvent({
    id: `approval-req:${request.id}`,
    tenantId: request.tenantId,
    entityType: "aprovacao",
    entityId: request.id,
    module: "approval",
    category: "approval",
    title: `REQUEST:${request.approvalKey}`,
    description: `Status ${request.status}`,
    status: request.status,
    severity: request.status === "expired" ? "high" : "info",
    actor: {
      id: request.requesterId ?? request.requesterSystemKey,
      name: request.requesterId ?? request.requesterSystemKey,
      avatar: null,
      type: request.requesterActorType,
    },
    createdAt: request.createdAt,
    metadata: { ...request.metadata, amount: request.amount },
    source: "approval",
    link: null,
    correlationId: request.correlationId,
  });
}

export function mapNotificationToTimelineEvent(
  row: PersistedNotification,
): TimelineEvent {
  return baseEvent({
    id: `notification:${row.id}`,
    tenantId: row.tenantId,
    entityType: "notification",
    entityId: row.id,
    module: "notifications",
    category: row.category,
    title: row.title,
    description: row.message,
    status: row.status,
    severity: severityOf(row.priority),
    actor: {
      id: null,
      name: row.source,
      avatar: null,
      type: "system",
    },
    createdAt: row.createdAt,
    metadata: { ...row.metadata, event: row.event },
    source: "notifications",
    link: null,
    correlationId: row.correlationId,
  });
}

export function mapOutboxToTimelineEvent(
  row: EnterpriseOutboxEvent,
): TimelineEvent {
  return baseEvent({
    id: `outbox:${row.id}`,
    tenantId: row.tenantId,
    entityType: "outbox",
    entityId: row.aggregateId,
    module: row.aggregateType,
    category: "outbox",
    title: String(row.eventType),
    description: row.lastError ?? `Status ${row.status}`,
    status: row.status,
    severity:
      row.status === "failed"
        ? "critical"
        : row.status === "pending"
          ? "medium"
          : "info",
    actor: {
      id: row.lockedBy,
      name: row.lockedBy,
      avatar: null,
      type: "system",
    },
    createdAt: row.createdAt,
    metadata: {
      ...(row.payload as Record<string, unknown>),
      attempts: row.attempts,
      aggregateType: row.aggregateType,
    },
    source: "outbox",
    link: null,
    correlationId: row.correlationId,
  });
}

export function dedupeTimelineEvents(
  events: readonly TimelineEvent[],
): TimelineEvent[] {
  const seen = new Set<string>();
  const out: TimelineEvent[] = [];
  for (const e of events) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out;
}

export function sortTimelineEvents(
  events: readonly TimelineEvent[],
  order: "asc" | "desc" = "desc",
): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const cmp = a.createdAt.localeCompare(b.createdAt);
    return order === "asc" ? cmp : -cmp;
  });
}
