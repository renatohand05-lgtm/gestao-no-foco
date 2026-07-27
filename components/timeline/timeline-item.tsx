"use client";

import type { TimelineEvent } from "@/lib/timeline";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  event: TimelineEvent;
  selected?: boolean;
  className?: string;
  onSelect?: (event: TimelineEvent) => void;
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TimelineItem({
  event,
  selected,
  className,
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      data-timeline-item
      data-source={event.source}
      onClick={() => onSelect?.(event)}
      className={cn(
        "w-full rounded-xl border border-border/50 bg-[var(--brand-white)] p-3 text-left transition-colors hover:bg-muted/40",
        selected && "ring-2 ring-primary/40",
        className,
      )}
    >
      <div className="flex gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: event.color }}
        >
          {event.source.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {event.title}
            </p>
            {event.status ? (
              <span className={cn(gofTypography.caption, "rounded bg-muted px-1.5 py-0.5")}>
                {event.status}
              </span>
            ) : null}
          </div>
          {event.description ? (
            <p className={cn(gofTypography.caption, "line-clamp-2")}>
              {event.description}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <span className={gofTypography.caption}>{formatTime(event.createdAt)}</span>
            {event.module ? (
              <span className={gofTypography.caption}>· {event.module}</span>
            ) : null}
            {event.actorName ? (
              <span className={gofTypography.caption}>· {event.actorName}</span>
            ) : null}
          </div>
          {event.tags.length ? (
            <div className="flex flex-wrap gap-1">
              {event.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-border/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
