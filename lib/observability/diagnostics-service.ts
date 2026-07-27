/**
 * Sprint 21.9 — Diagnostics Service.
 * Snapshot diagnóstico read-only · multi-tenant.
 */

import type { SystemHealth, ObservabilityMetrics, ObservabilityAlert } from "./observability-types.ts";

export type DiagnosticsReport = {
  tenantId: string;
  generatedAt: string;
  health: SystemHealth;
  metrics: ObservabilityMetrics;
  alerts: ObservabilityAlert[];
  notes: string[];
};

export function createDiagnosticsService() {
  return {
    build(input: {
      tenantId: string;
      health: SystemHealth;
      metrics: ObservabilityMetrics;
      alerts: ObservabilityAlert[];
    }): DiagnosticsReport {
      const notes: string[] = [];
      if (input.health.status !== "healthy") {
        notes.push(`health_${input.health.status}`);
      }
      if (input.metrics.errors > 0) notes.push("errors_present");
      if (input.metrics.outboxPending > 0) notes.push("outbox_pending");
      if (input.alerts.some((a) => a.status === "open" && a.severity === "critical")) {
        notes.push("critical_alerts");
      }
      for (const svc of input.health.services) {
        if (svc.status === "unhealthy") notes.push(`service_down:${svc.name}`);
      }

      return {
        tenantId: input.tenantId,
        generatedAt: new Date().toISOString(),
        health: input.health,
        metrics: input.metrics,
        alerts: input.alerts.filter((a) => a.tenantId === input.tenantId),
        notes,
      };
    },
  };
}

export type DiagnosticsService = ReturnType<typeof createDiagnosticsService>;
