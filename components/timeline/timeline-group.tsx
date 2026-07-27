"use client";

import { TimelineItem } from "@/components/timeline/timeline-item";
import type { TimelineEvent, TimelineGroup } from "@/lib/timeline";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  group: TimelineGroup;
  selectedId?: string | null;
  className?: string;
  onSelect?: (event: TimelineEvent) => void;
};

export function TimelineGroupView({
  group,
  selectedId,
  className,
  onSelect,
}: Props) {
  return (
    <section
      data-timeline-group
      className={cn("space-y-2", className)}
      aria-label={group.label}
    >
      <h3 className={cn(gofTypography.title, "text-sm")}>
        {group.label}{" "}
        <span className={gofTypography.caption}>({group.count})</span>
      </h3>
      <div className="space-y-2 border-l border-border/60 pl-3">
        {group.items.map((event) => (
          <TimelineItem
            key={event.id}
            event={event}
            selected={selectedId === event.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
