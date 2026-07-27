/**
 * Sprint 21.9 — Enterprise Observability · tipos.
 * Camada de leitura / diagnóstico · sem nova engine.
 */

export type ObservabilitySeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type ObservabilityHealthStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "unknown";

export type ObservabilityServiceName =
  | "database"
  | "supabase"
  | "workflow"
  | "approval"
  | "timeline"
  | "notifications"
  | "outbox"
  | "storage"
  | "server_actions";

export type ObservabilityAlertKind =
  | "workflow_failure"
  | "approval_timeout"
  | "outbox_backlog"
  | "notification_failure"
  | "database_unavailable"
  | "high_latency";

export type LatencyStats = {
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  samples: number;
};

export type ServiceHealth = {
  name: ObservabilityServiceName;
  status: ObservabilityHealthStatus;
  latencyMs: number | null;
  message: string | null;
  checkedAt: string;
};

export type SystemHealth = {
  status: ObservabilityHealthStatus;
  checkedAt: string;
  tenantId: string;
  services: ServiceHealth[];
  availabilityPct: number;
};

export type ObservabilityMetrics = {
  tenantId: string;
  collectedAt: string;
  requests: number;
  errors: number;
  latency: LatencyStats;
  workflowExecutions: number;
  approvals: number;
  notifications: number;
  timelineEvents: number;
  outboxPending: number;
  outboxFailed: number;
  serverActions: number;
  byService: Record<string, { requests: number; errors: number; latency: LatencyStats }>;
};

export type StructuredLogEntry = {
  timestamp: string;
  tenantId: string | null;
  module: string;
  action: string;
  actor: string | null;
  severity: ObservabilitySeverity;
  correlationId: string | null;
  duration: number | null;
  status: string;
  metadata: Record<string, unknown>;
  message?: string;
};

export type TraceSpan = {
  traceId: string;
  correlationId: string;
  requestId: string;
  tenantId: string | null;
  module: string;
  action: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  status: "running" | "ok" | "error";
  metadata: Record<string, unknown>;
};

export type ObservabilityAlert = {
  id: string;
  tenantId: string;
  kind: ObservabilityAlertKind;
  severity: ObservabilitySeverity;
  title: string;
  message: string;
  service: ObservabilityServiceName | "system";
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type ObservabilityKpis = {
  systemHealth: ObservabilityHealthStatus;
  availabilityPct: number;
  latencyAvgMs: number;
  errors: number;
  requests: number;
  approvals: number;
  notifications: number;
  outboxPending: number;
  timelineEvents: number;
};

export type ObservabilityFilters = {
  tenantId?: string | null;
  service?: ObservabilityServiceName | string | null;
  module?: string | null;
  status?: string | null;
  severity?: ObservabilitySeverity | null;
  from?: string | null;
  to?: string | null;
};

export type ObservabilitySnapshot = {
  health: SystemHealth;
  metrics: ObservabilityMetrics;
  alerts: ObservabilityAlert[];
  kpis: ObservabilityKpis;
  traces: TraceSpan[];
};
