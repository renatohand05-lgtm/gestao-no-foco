"use client";

import type { NotificationHistoryEntry } from "@/lib/notifications";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  entries: NotificationHistoryEntry[];
  className?: string;
};

export function NotificationTimelineView({ entries, className }: Props) {
  if (!entries.length) {
    return (
      <p
        role="status"
        className={cn(gofTypography.subtitle, "text-sm", className)}
      >
        Sem eventos na timeline.
      </p>
    );
  }

  return (
    <ol
      aria-label="Timeline de notificação"
      data-notification-timeline
      className={cn("relative space-y-3 border-l border-border/60 pl-4", className)}
    >
      {entries.map((entry) => (
        <li key={entry.id} className="relative space-y-0.5">
          <span
            className="absolute -left-[1.15rem] top-1.5 size-2 rounded-full bg-foreground/70"
            aria-hidden
          />
          <p className="text-sm font-medium text-foreground">{entry.type}</p>
          <p className={gofTypography.caption}>
            {entry.at}
            {entry.channel ? ` · ${entry.channel}` : ""}
            {entry.message ? ` · ${entry.message}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
