"use client";

import { gofMotion, gofRadius } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  rows?: number;
  className?: string;
};

export function WorkflowLoading({ rows = 3, className }: Props) {
  const count = Math.max(1, Math.min(10, rows));
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando workflow"
      data-workflow-state="loading"
      className={cn("space-y-3", gofMotion.fade, className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={`wf-skel-${i}`}
          className={cn(
            "h-16 animate-pulse bg-muted/70 ring-1 ring-border/40",
            gofRadius.lg,
          )}
        />
      ))}
    </div>
  );
}
