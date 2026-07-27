/**
 * Sprint 21.9 — Status Service (executive KPIs).
 */

import type {
  ObservabilityKpis,
  ObservabilityMetrics,
  SystemHealth,
} from "./observability-types.ts";

export function createStatusService() {
  return {
    toKpis(health: SystemHealth, metrics: ObservabilityMetrics): ObservabilityKpis {
      return {
        systemHealth: health.status,
        availabilityPct: health.availabilityPct,
        latencyAvgMs: metrics.latency.avgMs,
        errors: metrics.errors,
        requests: metrics.requests,
        approvals: metrics.approvals,
        notifications: metrics.notifications,
        outboxPending: metrics.outboxPending,
        timelineEvents: metrics.timelineEvents,
      };
    },

    summarize(health: SystemHealth, metrics: ObservabilityMetrics) {
      return {
        status: health.status,
        availabilityPct: health.availabilityPct,
        latency: metrics.latency,
        kpis: this.toKpis(health, metrics),
        services: health.services,
      };
    },
  };
}

export type StatusService = ReturnType<typeof createStatusService>;
