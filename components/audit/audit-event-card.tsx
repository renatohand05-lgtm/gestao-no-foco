"use client";

import { AuditCategoryBadge } from "@/components/audit/audit-category-badge";
import { AuditSeverityBadge } from "@/components/audit/audit-severity-badge";
import { ExecutiveCard } from "@/components/executive";
import {
  formatAuditActor,
  formatAuditEventTitle,
  formatAuditTarget,
  formatAuditTimestamp,
  type AuditEvent,
} from "@/lib/audit";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  event: AuditEvent;
  className?: string;
  onSelect?: (event: AuditEvent) => void;
};

export function AuditEventCard({ event, className, onSelect }: Props) {
  const body = (
    <ExecutiveCard
      padding={16}
      interactive={Boolean(onSelect)}
      className={cn("min-w-0 space-y-2 text-left", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className={cn(gofTypography.caption)}>
            {formatAuditTimestamp(event.timestamp)}
          </p>
          <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
            {formatAuditEventTitle(event)}
          </h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <AuditSeverityBadge severity={event.severity} />
          <AuditCategoryBadge category={event.category} />
        </div>
      </div>
      <p className={cn(gofTypography.subtitle, "text-sm line-clamp-2")}>
        {event.description}
      </p>
      <dl className={cn(gofTypography.caption, "grid gap-1 sm:grid-cols-2")}>
        <div>
          <dt className="inline text-muted-foreground">Ator: </dt>
          <dd className="inline break-all">{formatAuditActor(event)}</dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Alvo: </dt>
          <dd className="inline break-all">{formatAuditTarget(event)}</dd>
        </div>
      </dl>
    </ExecutiveCard>
  );

  if (!onSelect) {
    return (
      <div data-audit-event={event.event} data-audit-id={event.id}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-audit-event={event.event}
      data-audit-id={event.id}
      className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/35"
      onClick={() => onSelect(event)}
    >
      {body}
    </button>
  );
}
