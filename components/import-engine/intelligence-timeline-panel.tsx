import { CheckCircle2, CircleAlert, CircleDashed, XCircle } from "lucide-react";

import { ExecutiveEmptyState } from "@/components/executive";
import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import { cn } from "@/lib/utils";
import type { IntelligenceTimelineEvent } from "./intelligence-presentation";

type Props = {
  events: IntelligenceTimelineEvent[];
  title?: string;
  description?: string;
  className?: string;
};

function statusIcon(status: IntelligenceTimelineEvent["status"]) {
  if (status === "done") return CheckCircle2;
  if (status === "warning") return CircleAlert;
  if (status === "error") return XCircle;
  return CircleDashed;
}

function statusTone(
  status: IntelligenceTimelineEvent["status"],
): "success" | "warning" | "danger" | "neutral" {
  if (status === "done") return "success";
  if (status === "warning") return "warning";
  if (status === "error") return "danger";
  return "neutral";
}

/**
 * Timeline Enterprise derivada do run (apresentação).
 * Eventos granulares ainda não existem na persistência — narrativa estimada a partir do run.
 */
export function IntelligenceTimelinePanel({
  events,
  title = "Timeline Enterprise",
  description = "Narrativa do processamento a partir dos dados do run. Etapas intermédias são estimadas quando a engine não grava eventos por segundo.",
  className,
}: Props) {
  if (events.length === 0) {
    return (
      <ExecutiveEmptyState
        title="Sem timeline"
        description="Selecione ou execute uma importação para ver a narrativa de eventos."
        className={className}
      />
    );
  }

  return (
    <section
      aria-label={title}
      className={cn(
        "rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
        className,
      )}
    >
      <header className="mb-4 space-y-1">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
        <ExecutiveBadge tone="neutral" variant="outline">
          Estimativa visual
        </ExecutiveBadge>
      </header>

      <ol className="relative space-y-0">
        <div
          className="pointer-events-none absolute bottom-2 left-[1.15rem] top-2 w-px bg-gradient-to-b from-border via-border to-transparent sm:left-[1.35rem]"
          aria-hidden
        />
        {events.map((event, index) => {
          const Icon = statusIcon(event.status);
          return (
            <li
              key={event.id}
              className={cn(
                "relative grid grid-cols-[auto_1fr] gap-3 py-3 sm:gap-4",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-1",
              )}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="relative z-10 flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-full border bg-background shadow-sm",
                    event.status === "done" && "border-emerald-500/40 text-emerald-700",
                    event.status === "warning" && "border-amber-500/40 text-amber-700",
                    event.status === "error" && "border-red-500/40 text-red-700",
                    event.status === "pending" && "border-border text-muted-foreground",
                  )}
                  aria-hidden
                >
                  <Icon className="size-4" />
                </span>
                <time className="text-[10px] font-medium tabular-nums text-muted-foreground">
                  {event.timeLabel}
                </time>
              </div>
              <div className="min-w-0 rounded-lg border border-border/50 bg-background/60 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{event.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ExecutiveBadge tone={statusTone(event.status)} variant="soft">
                      {event.status}
                    </ExecutiveBadge>
                    {event.durationLabel ? (
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {event.durationLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
