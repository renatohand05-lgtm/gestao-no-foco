"use client";

import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  total?: number;
  className?: string;
};

export function TimelineHeader({
  title = "Activity Timeline",
  subtitle = "Eventos Enterprise unificados",
  total,
  className,
}: Props) {
  return (
    <header
      data-timeline-header
      className={cn("space-y-1", className)}
    >
      <h2 className={cn(gofTypography.title, "text-lg")}>{title}</h2>
      <p className={gofTypography.caption}>
        {subtitle}
        {total != null ? ` · ${total} evento(s)` : ""}
      </p>
    </header>
  );
}
