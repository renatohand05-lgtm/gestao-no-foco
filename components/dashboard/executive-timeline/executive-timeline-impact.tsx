"use client";

import type { ExecutiveTimelineEvent } from "@/lib/executive-timeline";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { ExecutiveBadge } from "@/components/executive";

type Props = {
  event: ExecutiveTimelineEvent;
  className?: string;
};

export function ExecutiveTimelineImpact({ event, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <ExecutiveBadge tone="neutral" variant="outline">
        Impacto {event.impact}
      </ExecutiveBadge>
      <ExecutiveBadge tone="neutral" variant="soft">
        Prioridade {event.priority}
      </ExecutiveBadge>
      <span className={gofTypography.caption}>Fonte · {event.source}</span>
    </div>
  );
}
