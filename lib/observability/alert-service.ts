/**
 * Sprint 21.9 — Alert Service.
 * Gera alertas a partir de health/metrics · sem nova engine.
 */

import { filterAlerts } from "./observability-filters.ts";
import type {
  ObservabilityAlert,
  ObservabilityAlertKind,
  ObservabilityFilters,
  ObservabilityMetrics,
  ObservabilitySeverity,
  SystemHealth,
} from "./observability-types.ts";

const MAX_ALERTS = 200;

function id(kind: string): string {
  return `alert_${kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type AlertServiceDeps = {
  store?: ObservabilityAlert[];
  outboxBacklogThreshold?: number;
  highLatencyMs?: number;
};

export function createAlertService(deps: AlertServiceDeps = {}) {
  const store = deps.store ?? [];
  const backlogThreshold = deps.outboxBacklogThreshold ?? 50;
  const highLatencyMs = deps.highLatencyMs ?? 1500;

  function upsertOpen(alert: Omit<ObservabilityAlert, "id" | "createdAt" | "status"> & {
    id?: string;
    createdAt?: string;
    status?: ObservabilityAlert["status"];
  }) {
    const existing = store.find(
      (a) =>
        a.tenantId === alert.tenantId &&
        a.kind === alert.kind &&
        a.status === "open",
    );
    if (existing) {
      existing.message = alert.message;
      existing.metadata = alert.metadata;
      existing.severity = alert.severity;
      return existing;
    }
    const row: ObservabilityAlert = {
      id: alert.id ?? id(alert.kind),
      tenantId: alert.tenantId,
      kind: alert.kind,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      service: alert.service,
      status: alert.status ?? "open",
      createdAt: alert.createdAt ?? new Date().toISOString(),
      metadata: alert.metadata,
    };
    store.push(row);
    if (store.length > MAX_ALERTS) store.splice(0, store.length - MAX_ALERTS);
    return row;
  }

  return {
    evaluate(input: {
      tenantId: string;
      health: SystemHealth;
      metrics: ObservabilityMetrics;
      workflowBlocked?: number;
      approvalsExpired?: number;
      notificationsFailed?: number;
    }): ObservabilityAlert[] {
      const { tenantId, health, metrics } = input;
      const opened: ObservabilityAlert[] = [];

      const db = health.services.find((s) => s.name === "database");
      if (db && db.status === "unhealthy") {
        opened.push(
          upsertOpen({
            tenantId,
            kind: "database_unavailable",
            severity: "critical",
            title: "Database unavailable",
            message: db.message ?? "Database probe failed",
            service: "database",
            metadata: { latencyMs: db.latencyMs },
          }),
        );
      }

      if (metrics.outboxPending >= backlogThreshold) {
        opened.push(
          upsertOpen({
            tenantId,
            kind: "outbox_backlog",
            severity: metrics.outboxPending > backlogThreshold * 2 ? "high" : "medium",
            title: "Outbox backlog",
            message: `Pending outbox events: ${metrics.outboxPending}`,
            service: "outbox",
            metadata: { pending: metrics.outboxPending, threshold: backlogThreshold },
          }),
        );
      }

      if (metrics.latency.p95Ms >= highLatencyMs || metrics.latency.avgMs >= highLatencyMs) {
        opened.push(
          upsertOpen({
            tenantId,
            kind: "high_latency",
            severity: "high",
            title: "High latency",
            message: `P95=${metrics.latency.p95Ms}ms · avg=${metrics.latency.avgMs}ms`,
            service: "system",
            metadata: { latency: metrics.latency },
          }),
        );
      }

      if ((input.workflowBlocked ?? 0) > 0) {
        opened.push(
          upsertOpen({
            tenantId,
            kind: "workflow_failure",
            severity: "high",
            title: "Workflow failure / blocked",
            message: `${input.workflowBlocked} workflow(s) blocked`,
            service: "workflow",
            metadata: { blocked: input.workflowBlocked },
          }),
        );
      }

      if ((input.approvalsExpired ?? 0) > 0) {
        opened.push(
          upsertOpen({
            tenantId,
            kind: "approval_timeout",
            severity: "medium",
            title: "Approval timeout",
            message: `${input.approvalsExpired} approval(s) expired`,
            service: "approval",
            metadata: { expired: input.approvalsExpired },
          }),
        );
      }

      if ((input.notificationsFailed ?? 0) > 0 || metrics.outboxFailed > 0) {
        opened.push(
          upsertOpen({
            tenantId,
            kind: "notification_failure",
            severity: "medium",
            title: "Notification / delivery failure",
            message: `Failed notifications: ${input.notificationsFailed ?? 0} · outbox failed: ${metrics.outboxFailed}`,
            service: "notifications",
            metadata: {
              notificationsFailed: input.notificationsFailed ?? 0,
              outboxFailed: metrics.outboxFailed,
            },
          }),
        );
      }

      return opened;
    },

    list(
      tenantId: string,
      filters: ObservabilityFilters = {},
    ): ObservabilityAlert[] {
      return filterAlerts(store, { ...filters, tenantId }).slice().reverse();
    },

    raise(input: {
      tenantId: string;
      kind: ObservabilityAlertKind;
      severity: ObservabilitySeverity;
      title: string;
      message: string;
      service: ObservabilityAlert["service"];
      metadata?: Record<string, unknown>;
    }) {
      return upsertOpen({
        ...input,
        metadata: input.metadata ?? {},
      });
    },

    clear() {
      store.length = 0;
    },

    _store: store,
  };
}

export type AlertService = ReturnType<typeof createAlertService>;
