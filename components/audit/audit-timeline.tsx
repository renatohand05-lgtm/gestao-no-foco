"use client";

import { AuditEmptyState } from "@/components/audit/audit-empty-state";
import { AuditEventCard } from "@/components/audit/audit-event-card";
import {
  buildAuditTimeline,
  type AuditEvent,
  type AuditFilterCriteria,
  type AuditTimelineGroupBy,
} from "@/lib/audit";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  events: readonly AuditEvent[];
  tenantId?: string;
  filters?: AuditFilterCriteria;
  limit?: number;
  groupBy?: AuditTimelineGroupBy;
  className?: string;
  onSelect?: (event: AuditEvent) => void;
};

export function AuditTimeline({
  events,
  tenantId,
  filters,
  limit,
  groupBy,
  className,
  onSelect,
}: Props) {
  const timeline = buildAuditTimeline(events, {
    tenantId,
    filters,
    limit,
    groupBy,
  });

  if (timeline.events.length === 0) {
    return <AuditEmptyState className={className} />;
  }

  if (timeline.groups) {
    return (
      <div
        data-audit-timeline="grouped"
        className={cn("space-y-6", className)}
      >
        {timeline.groups.map((group) => (
          <section key={group.key} className="space-y-3" aria-label={group.label}>
            <header className="flex items-baseline justify-between gap-2">
              <h3 className={cn(gofTypography.title, "text-sm sm:text-base")}>
                {group.label}
              </h3>
              <span className={gofTypography.caption}>{group.count}</span>
            </header>
            <ul className="space-y-2">
              {group.events.map((event) => (
                <li key={event.id}>
                  <AuditEventCard event={event} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <ul
      data-audit-timeline="flat"
      className={cn("space-y-2", className)}
    >
      {timeline.events.map((event) => (
        <li key={event.id}>
          <AuditEventCard event={event} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}
