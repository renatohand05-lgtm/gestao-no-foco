import { ExecutiveCard } from "@/components/executive";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ExecutiveTimelineResult } from "@/lib/intelligence/types";

type Props = {
  timeline: ExecutiveTimelineResult;
};

/**
 * Timeline de marcos do mês (Sprint 11.1) — distinta da Timeline Executiva Premium (11.5).
 */
export function ExecutiveMonthTimeline({ timeline }: Props) {
  return (
    <ExecutiveCard
      padding={24}
      className={cn("h-full", exAnimations.slide)}
      aria-label="Timeline executiva do mês"
    >
      <p className={exTypography.label}>Timeline do mês</p>
      <p className={cn("mt-1", exTypography.caption)}>
        {timeline.elapsedBusinessDays} de {timeline.totalBusinessDays} dias
        úteis · restam {timeline.remainingBusinessDays}
      </p>

      <div className="relative mt-6">
        <div
          className="absolute left-0 right-0 top-2 h-1 rounded-full bg-muted"
          aria-hidden
        />
        <div
          className="absolute left-0 top-2 h-1 rounded-full bg-blue-600 motion-safe:transition-[width] motion-safe:duration-700"
          style={{
            width: `${Math.min(
              100,
              timeline.totalBusinessDays <= 0
                ? 0
                : (timeline.elapsedBusinessDays /
                    timeline.totalBusinessDays) *
                    100,
            )}%`,
          }}
          aria-hidden
        />
        <ol className="relative space-y-4 pt-6">
          {timeline.milestones.map((m) => (
            <li key={m.id} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 size-3 shrink-0 rounded-full ring-2 ring-background",
                  m.status === "done" && "bg-emerald-600",
                  m.status === "current" && "bg-blue-600",
                  m.status === "projected" && "bg-violet-500",
                  m.status === "upcoming" && "bg-muted-foreground/40",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-sm font-semibold tabular-nums">{m.value}</p>
                </div>
                <p className={exTypography.caption}>
                  Posição {Math.round(m.positionPercent)}% · {m.status}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </ExecutiveCard>
  );
}
