/**
 * Sprint 21.9 — Filtros e estatísticas de latência.
 */

import type {
  LatencyStats,
  ObservabilityAlert,
  ObservabilityFilters,
  ObservabilitySeverity,
  StructuredLogEntry,
  TraceSpan,
} from "./observability-types.ts";

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx] ?? 0;
}

export function computeLatencyStats(samples: readonly number[]): LatencyStats {
  if (samples.length === 0) {
    return { avgMs: 0, p95Ms: 0, p99Ms: 0, minMs: 0, maxMs: 0, samples: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  return {
    avgMs: Math.round((sum / sorted.length) * 100) / 100,
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
    minMs: sorted[0]!,
    maxMs: sorted[sorted.length - 1]!,
    samples: sorted.length,
  };
}

function inPeriod(
  iso: string,
  from?: string | null,
  to?: string | null,
): boolean {
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

export function filterAlerts(
  alerts: readonly ObservabilityAlert[],
  filters: ObservabilityFilters = {},
): ObservabilityAlert[] {
  return alerts.filter((a) => {
    if (filters.tenantId && a.tenantId !== filters.tenantId) return false;
    if (filters.service && a.service !== filters.service) return false;
    if (filters.status && a.status !== filters.status) return false;
    if (filters.severity && a.severity !== filters.severity) return false;
    if (!inPeriod(a.createdAt, filters.from, filters.to)) return false;
    return true;
  });
}

export function filterLogs(
  logs: readonly StructuredLogEntry[],
  filters: ObservabilityFilters = {},
): StructuredLogEntry[] {
  return logs.filter((l) => {
    if (filters.tenantId && l.tenantId !== filters.tenantId) return false;
    if (filters.module && l.module !== filters.module) return false;
    if (filters.status && l.status !== filters.status) return false;
    if (filters.severity && l.severity !== filters.severity) return false;
    if (!inPeriod(l.timestamp, filters.from, filters.to)) return false;
    return true;
  });
}

export function filterTraces(
  traces: readonly TraceSpan[],
  filters: ObservabilityFilters = {},
): TraceSpan[] {
  return traces.filter((t) => {
    if (filters.tenantId && t.tenantId !== filters.tenantId) return false;
    if (filters.module && t.module !== filters.module) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (!inPeriod(t.startedAt, filters.from, filters.to)) return false;
    return true;
  });
}

const SEVERITY_RANK: Record<ObservabilitySeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function severityAtLeast(
  value: ObservabilitySeverity,
  min: ObservabilitySeverity,
): boolean {
  return SEVERITY_RANK[value] >= SEVERITY_RANK[min];
}
