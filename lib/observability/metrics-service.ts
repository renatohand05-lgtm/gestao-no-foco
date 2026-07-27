/**
 * Sprint 21.9 — Metrics Service (in-process, tenant-scoped).
 */

import { computeLatencyStats } from "./observability-filters.ts";
import type {
  LatencyStats,
  ObservabilityMetrics,
} from "./observability-types.ts";

export type MetricSample = {
  tenantId: string;
  service: string;
  module?: string;
  action?: string;
  durationMs: number;
  status: "ok" | "error";
  kind?:
    | "request"
    | "server_action"
    | "workflow"
    | "approval"
    | "notification"
    | "timeline"
    | "outbox";
  at: string;
};

const MAX_SAMPLES = 2000;

export type MetricsServiceDeps = {
  store?: MetricSample[];
};

export function createMetricsService(deps: MetricsServiceDeps = {}) {
  const store = deps.store ?? [];

  function record(sample: Omit<MetricSample, "at"> & { at?: string }) {
    store.push({
      ...sample,
      at: sample.at ?? new Date().toISOString(),
    });
    if (store.length > MAX_SAMPLES) {
      store.splice(0, store.length - MAX_SAMPLES);
    }
  }

  function forTenant(tenantId: string): MetricSample[] {
    return store.filter((s) => s.tenantId === tenantId);
  }

  function latencyOf(samples: MetricSample[]): LatencyStats {
    return computeLatencyStats(samples.map((s) => s.durationMs));
  }

  return {
    recordRequest(
      tenantId: string,
      service: string,
      durationMs: number,
      status: "ok" | "error" = "ok",
      extras?: Partial<MetricSample>,
    ) {
      record({
        tenantId,
        service,
        durationMs,
        status,
        kind: extras?.kind ?? "request",
        module: extras?.module,
        action: extras?.action,
      });
    },

    snapshot(
      tenantId: string,
      counters?: {
        workflowExecutions?: number;
        approvals?: number;
        notifications?: number;
        timelineEvents?: number;
        outboxPending?: number;
        outboxFailed?: number;
      },
    ): ObservabilityMetrics {
      const samples = forTenant(tenantId);
      const byService: ObservabilityMetrics["byService"] = {};
      for (const s of samples) {
        const bucket = byService[s.service] ?? {
          requests: 0,
          errors: 0,
          latency: computeLatencyStats([]),
        };
        bucket.requests += 1;
        if (s.status === "error") bucket.errors += 1;
        byService[s.service] = bucket;
      }
      for (const [key, bucket] of Object.entries(byService)) {
        bucket.latency = latencyOf(samples.filter((s) => s.service === key));
        byService[key] = bucket;
      }

      return {
        tenantId,
        collectedAt: new Date().toISOString(),
        requests: samples.length,
        errors: samples.filter((s) => s.status === "error").length,
        latency: latencyOf(samples),
        workflowExecutions:
          counters?.workflowExecutions ??
          samples.filter((s) => s.kind === "workflow").length,
        approvals:
          counters?.approvals ??
          samples.filter((s) => s.kind === "approval").length,
        notifications:
          counters?.notifications ??
          samples.filter((s) => s.kind === "notification").length,
        timelineEvents:
          counters?.timelineEvents ??
          samples.filter((s) => s.kind === "timeline").length,
        outboxPending: counters?.outboxPending ?? 0,
        outboxFailed: counters?.outboxFailed ?? 0,
        serverActions: samples.filter((s) => s.kind === "server_action").length,
        byService,
      };
    },

    clear() {
      store.length = 0;
    },

    _store: store,
  };
}

export type MetricsService = ReturnType<typeof createMetricsService>;
