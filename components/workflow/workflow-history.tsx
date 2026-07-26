"use client";

import { WorkflowEmptyState } from "@/components/workflow/workflow-empty-state";
import { listHistory, type WorkflowInstance } from "@/lib/workflow";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  instance: WorkflowInstance;
  className?: string;
};

export function WorkflowHistory({ instance, className }: Props) {
  const entries = listHistory(instance, "desc");

  if (entries.length === 0) {
    return <WorkflowEmptyState title="Histórico vazio" className={className} />;
  }

  return (
    <ol
      data-workflow-history
      className={cn("space-y-2", className)}
      aria-label="Histórico do workflow"
    >
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded-xl border border-border/60 bg-[var(--brand-white)] px-3 py-2.5"
        >
          <p className={cn(gofTypography.caption)}>
            {new Date(entry.at).toISOString()}
          </p>
          <p className="text-sm font-medium text-foreground">
            {entry.fromState ?? "—"} → {entry.toState}
            {entry.event ? ` · ${entry.event}` : ""}
          </p>
          <p className={cn(gofTypography.subtitle, "text-xs")}>
            {entry.actor.userId ?? entry.actor.type ?? "system"}
            {entry.reason ? ` · ${entry.reason}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
