"use client";

import { LatencyCard } from "@/components/observability/latency-card";
import type { ObservabilityMetrics } from "@/lib/observability";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  metrics: ObservabilityMetrics;
  className?: string;
};

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/40 px-3 py-2">
      <p className={gofTypography.caption}>{label}</p>
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function MetricsDashboard({ metrics, className }: Props) {
  return (
    <section data-metrics-dashboard className={cn("space-y-3", className)}>
      <p className={gofTypography.title}>Metrics</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Requests" value={metrics.requests} />
        <Metric label="Errors" value={metrics.errors} />
        <Metric label="Workflows" value={metrics.workflowExecutions} />
        <Metric label="Approvals" value={metrics.approvals} />
        <Metric label="Notifications" value={metrics.notifications} />
        <Metric label="Timeline" value={metrics.timelineEvents} />
        <Metric label="Outbox pending" value={metrics.outboxPending} />
        <Metric label="Server Actions" value={metrics.serverActions} />
      </div>
      <LatencyCard latency={metrics.latency} />
    </section>
  );
}
