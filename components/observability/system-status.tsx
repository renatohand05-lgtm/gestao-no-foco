"use client";

import type { ObservabilityKpis } from "@/lib/observability";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  kpis: ObservabilityKpis;
  className?: string;
};

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/40 px-3 py-2">
      <p className={gofTypography.caption}>{label}</p>
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function SystemStatus({ kpis, className }: Props) {
  return (
    <section data-system-status className={cn("space-y-3", className)}>
      <p className={gofTypography.title}>Executive Dashboard</p>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="System Health" value={kpis.systemHealth} />
        <Kpi label="Availability" value={`${kpis.availabilityPct}%`} />
        <Kpi label="Latency" value={`${kpis.latencyAvgMs} ms`} />
        <Kpi label="Errors" value={kpis.errors} />
        <Kpi label="Requests" value={kpis.requests} />
        <Kpi label="Approvals" value={kpis.approvals} />
        <Kpi label="Notifications" value={kpis.notifications} />
        <Kpi label="Outbox" value={kpis.outboxPending} />
        <Kpi label="Timeline Events" value={kpis.timelineEvents} />
      </div>
    </section>
  );
}
