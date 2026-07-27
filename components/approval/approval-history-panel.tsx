"use client";

import type { ApprovalTimelineEvent } from "@/lib/approval/runtime";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

import { ApprovalEmptyState } from "@/components/approval/approval-empty-state";

type Props = {
  events: ApprovalTimelineEvent[];
  className?: string;
};

const EVENT_LABEL: Record<ApprovalTimelineEvent["type"], string> = {
  created: "Criada",
  approved: "Aprovada",
  rejected: "Rejeitada",
  delegated: "Delegada",
  escalated: "Escalonada",
  cancelled: "Cancelada",
  expired: "Expirada",
  reopened: "Reaberta",
  retry: "Retry",
  returned: "Devolvida",
  partial: "Parcial",
};

export function ApprovalHistoryPanel({ events, className }: Props) {
  if (events.length === 0) {
    return <ApprovalEmptyState className={className} />;
  }

  return (
    <section
      data-approval-history-panel
      className={cn("space-y-3", className)}
    >
      <h3 className={cn(gofTypography.title, "text-sm")}>Timeline de decisões</h3>
      <ol className="space-y-2 border-l border-border/60 pl-3">
        {events.map((event) => (
          <li key={event.id} className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              {EVENT_LABEL[event.type]}
            </p>
            <p className={gofTypography.caption}>
              {event.at}
              {event.actorId ? ` · ${event.actorId}` : ""}
              {event.auditLinked ? " · audit" : ""}
            </p>
            {event.comment ? (
              <p className="text-xs text-muted-foreground">{event.comment}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
