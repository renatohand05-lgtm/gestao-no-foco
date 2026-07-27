"use client";

import { Timeline } from "@/components/timeline/timeline";
import type {
  TimelineDashboardKpis,
  TimelineDetails,
  TimelineEvent,
  TimelineFilters,
} from "@/lib/timeline";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  items: TimelineEvent[];
  kpis: TimelineDashboardKpis;
  total?: number;
  details?: TimelineDetails | null;
  className?: string;
  onSelect?: (event: TimelineEvent) => void;
  onFiltersChange?: (filters: TimelineFilters) => void;
};

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/40 px-3 py-2">
      <p className={gofTypography.caption}>{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function TimelineDashboard({
  items,
  kpis,
  total,
  details,
  className,
  onSelect,
  onFiltersChange,
}: Props) {
  return (
    <div data-timeline-dashboard className={cn("space-y-4", className)}>
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Hoje" value={kpis.eventsToday} />
        <Kpi label="Semana" value={kpis.eventsWeek} />
        <Kpi label="Críticos" value={kpis.criticalEvents} />
        <Kpi label="Aprovações" value={kpis.approvals} />
        <Kpi label="Alertas" value={kpis.alerts} />
        <Kpi label="Workflows" value={kpis.workflows} />
      </section>
      <Timeline
        items={items}
        total={total}
        kpis={kpis}
        details={details}
        onSelect={onSelect}
        onFiltersChange={onFiltersChange}
      />
    </div>
  );
}
