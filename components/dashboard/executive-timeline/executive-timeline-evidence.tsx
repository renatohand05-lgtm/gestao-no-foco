"use client";

import type { ExecutiveTimelineEvidence } from "@/lib/executive-timeline";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  items: ExecutiveTimelineEvidence[];
  className?: string;
};

export function ExecutiveTimelineEvidenceList({ items, className }: Props) {
  if (items.length === 0) {
    return (
      <p className={cn(gofTypography.caption, className)}>
        Sem evidências adicionais.
      </p>
    );
  }

  return (
    <ul className={cn("space-y-1.5", className)} aria-label="Evidências do evento">
      {items.map((e) => (
        <li key={e.id} className={gofTypography.caption}>
          <span className="font-medium text-foreground">{e.label}:</span> {e.value}
          <span className="text-muted-foreground"> · {e.source}</span>
        </li>
      ))}
    </ul>
  );
}
