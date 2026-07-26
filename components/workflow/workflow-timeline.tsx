"use client";

import {
  groupHistoryByState,
  summarizeTimeline,
  type WorkflowInstance,
} from "@/lib/workflow";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

import { WorkflowEmptyState } from "@/components/workflow/workflow-empty-state";

type Props = {
  instance: WorkflowInstance;
  className?: string;
};

export function WorkflowTimeline({ instance, className }: Props) {
  const summary = summarizeTimeline(instance);
  const groups = groupHistoryByState(instance);

  if (groups.length === 0) {
    return <WorkflowEmptyState className={className} />;
  }

  return (
    <div data-workflow-timeline className={cn("space-y-4", className)}>
      <header className="space-y-1">
        <p className={cn(gofTypography.caption)}>Timeline</p>
        <p className="text-sm text-foreground">
          Estado atual: <strong>{summary.currentState}</strong> ·{" "}
          {summary.transitionCount} transição(ões)
        </p>
      </header>
      <div className="space-y-3">
        {groups.map((group) => (
          <section key={group.key} aria-label={group.label} className="space-y-1">
            <h3 className={cn(gofTypography.title, "text-sm")}>
              {group.label}{" "}
              <span className={gofTypography.caption}>({group.count})</span>
            </h3>
            <ul className="space-y-1 border-l border-border/60 pl-3">
              {group.entries.map((e) => (
                <li key={e.id} className={cn(gofTypography.caption)}>
                  {e.event ?? "create"} · {e.at}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
