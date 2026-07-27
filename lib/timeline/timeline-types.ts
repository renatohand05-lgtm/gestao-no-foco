/**
 * Sprint 21.8 — Enterprise Activity Timeline · tipos.
 * Camada de visualização — não é uma engine de eventos.
 */

export type TimelineSource =
  | "audit"
  | "workflow"
  | "approval"
  | "notifications"
  | "outbox"
  | "erp";

export type TimelineSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "unknown";

export type TimelineEntityType =
  | "cliente"
  | "fornecedor"
  | "os"
  | "venda"
  | "conta"
  | "produto"
  | "usuario"
  | "funcionario"
  | "aprovacao"
  | "workflow"
  | "notification"
  | "outbox"
  | "audit"
  | "generic";

export type TimelineActor = {
  id: string | null;
  name: string | null;
  avatar: string | null;
  type: string | null;
};

export type TimelineEvent = {
  id: string;
  tenantId: string;
  entityType: TimelineEntityType | string;
  entityId: string | null;
  module: string | null;
  category: string | null;
  title: string;
  description: string | null;
  status: string | null;
  severity: TimelineSeverity;
  actor: TimelineActor;
  actorName: string | null;
  actorAvatar: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
  source: TimelineSource;
  color: string;
  icon: string;
  link: string | null;
  correlationId: string | null;
  tags: string[];
};

export type TimelineGroupBy =
  | "day"
  | "week"
  | "month"
  | "module"
  | "category"
  | "user"
  | "none";

export type TimelineFilters = {
  tenantId?: string | null;
  module?: string | null;
  type?: string | null;
  category?: string | null;
  status?: string | null;
  severity?: TimelineSeverity | string | null;
  userId?: string | null;
  actorId?: string | null;
  source?: TimelineSource | string | null;
  entityType?: string | null;
  entityId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
};

export type TimelinePagination = {
  limit?: number;
  offset?: number;
  cursor?: string | null;
  order?: "asc" | "desc";
};

export type TimelinePage = {
  items: TimelineEvent[];
  total: number;
  limit: number;
  offset: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type TimelineGroup = {
  key: string;
  label: string;
  count: number;
  items: TimelineEvent[];
};

export type TimelineDashboardKpis = {
  eventsToday: number;
  eventsWeek: number;
  criticalEvents: number;
  approvals: number;
  alerts: number;
  workflows: number;
  notifications: number;
  outboxPending: number;
};

export type TimelineDetails = {
  event: TimelineEvent;
  relatedAudit: TimelineEvent[];
  relatedWorkflow: TimelineEvent[];
  relatedApproval: TimelineEvent[];
  relatedNotifications: TimelineEvent[];
  metadata: Record<string, unknown>;
};

export const TIMELINE_MAX_LIMIT = 100;
export const TIMELINE_DEFAULT_LIMIT = 25;
