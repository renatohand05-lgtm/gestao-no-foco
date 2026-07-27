"use client";

import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  label?: string;
};

export function TimelineLoading({
  className,
  label = "Carregando timeline…",
}: Props) {
  return (
    <div
      data-timeline-loading
      role="status"
      aria-busy="true"
      className={cn("space-y-3 p-4", className)}
    >
      <p className={gofTypography.caption}>{label}</p>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-lg bg-muted/60"
          aria-hidden
        />
      ))}
    </div>
  );
}
