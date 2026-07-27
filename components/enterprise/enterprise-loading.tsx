"use client";

import { gofMotion, gofRadius } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  rows?: number;
  className?: string;
};

export function EnterpriseLoading({ rows = 3, className }: Props) {
  const count = Math.max(1, Math.min(8, rows));
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando Enterprise"
      className={cn("space-y-3", gofMotion.fade, className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={`ent-skel-${i}`}
          className={cn(
            "h-14 animate-pulse bg-muted/70 ring-1 ring-border/40",
            gofRadius.lg,
          )}
        />
      ))}
    </div>
  );
}
