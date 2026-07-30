"use client";

import type { WorkflowPendingAction } from "@/lib/workflow";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

import { WorkflowEmptyState } from "@/components/workflow/workflow-empty-state";

type Props = {
  actions: readonly WorkflowPendingAction[];
  className?: string;
};

export function WorkflowActionList({ actions, className }: Props) {
  if (actions.length === 0) {
    return (
      <WorkflowEmptyState
        title="Sem ações pendentes"
        description="Nenhuma intenção de ação gerada."
        className={className}
      />
    );
  }

  return (
    <ul
      data-workflow-actions
      className={cn("space-y-2", className)}
      aria-label="Ações pendentes"
    >
      {actions.map((action) => (
        <li
          key={action.id}
          className="rounded-xl border border-border/60 bg-card px-3 py-2.5"
        >
          <p className="text-sm font-semibold text-foreground">{action.type}</p>
          <p className={cn(gofTypography.caption)}>
            {action.description}
          </p>
          <p className={cn(gofTypography.subtitle, "text-xs")}>
            transição {action.transitionId}
          </p>
        </li>
      ))}
    </ul>
  );
}
