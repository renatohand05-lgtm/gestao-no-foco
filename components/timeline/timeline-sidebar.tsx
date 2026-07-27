"use client";

import type { TimelineDashboardKpis, TimelineSource } from "@/lib/timeline";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  kpis?: TimelineDashboardKpis | null;
  sources?: TimelineSource[];
  className?: string;
  onSourceClick?: (source: TimelineSource) => void;
};

const SOURCES: TimelineSource[] = [
  "audit",
  "workflow",
  "approval",
  "notifications",
  "outbox",
  "erp",
];

export function TimelineSidebar({
  kpis,
  sources = SOURCES,
  className,
  onSourceClick,
}: Props) {
  return (
    <aside
      data-timeline-sidebar
      className={cn(
        "space-y-3 rounded-xl border border-border/60 p-3",
        className,
      )}
    >
      <h3 className={cn(gofTypography.title, "text-sm")}>Fontes</h3>
      <ul className="space-y-1">
        {sources.map((source) => (
          <li key={source}>
            <button
              type="button"
              className="w-full rounded px-2 py-1 text-left text-sm capitalize hover:bg-muted/50"
              onClick={() => onSourceClick?.(source)}
            >
              {source}
            </button>
          </li>
        ))}
      </ul>
      {kpis ? (
        <div className="space-y-1 border-t border-border/40 pt-2">
          <p className={gofTypography.caption}>
            Críticos: {kpis.criticalEvents}
          </p>
          <p className={gofTypography.caption}>
            Outbox pendente: {kpis.outboxPending}
          </p>
        </div>
      ) : null}
    </aside>
  );
}
