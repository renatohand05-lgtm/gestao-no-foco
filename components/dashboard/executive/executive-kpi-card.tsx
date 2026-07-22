import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exColors,
  exRadius,
  exShadow,
  exTypography,
  type ExColorTone,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

export type ExecutiveKpiTrend = {
  label: string;
  direction?: "up" | "down" | "flat";
};

export type ExecutiveKpiProgress = {
  value: number | null;
  label?: string;
};

type Props = {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: ExColorTone;
  supportingText?: string;
  trend?: ExecutiveKpiTrend;
  progress?: ExecutiveKpiProgress;
  loading?: boolean;
  href?: string;
  className?: string;
};

function toneText(tone: ExColorTone) {
  if (tone === "neutral") return "text-foreground";
  return exColors[tone].text;
}

function toneSoft(tone: ExColorTone) {
  if (tone === "neutral") return "bg-muted/70 text-muted-foreground";
  return exColors[tone].soft;
}

function ProgressBar({ progress }: { progress: ExecutiveKpiProgress }) {
  if (progress.value == null) {
    return (
      <div className="h-1.5 w-full rounded-full bg-muted" aria-hidden />
    );
  }
  const pct = progress.value;
  const fill = Math.min(Math.max(pct, 0), 100);

  return (
    <div className="space-y-1">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={progress.label ?? "Progresso"}
      >
        <div
          className={cn(
            "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500",
            pct >= 100
              ? "bg-emerald-600"
              : pct >= 80
                ? "bg-sky-600"
                : "bg-rose-500",
          )}
          style={{ width: `${fill}%` }}
        />
      </div>
      {progress.label ? (
        <p className="text-[0.8125rem] font-normal whitespace-nowrap text-muted-foreground">
          {progress.label}
        </p>
      ) : null}
    </div>
  );
}

/**
 * KPI Card oficial do Dashboard Executivo (Sprint 16 Gate 16.1).
 * Visual only — não calcula métricas.
 */
export function ExecutiveKpiCard({
  title,
  value,
  icon: Icon,
  tone = "neutral",
  supportingText,
  trend,
  progress,
  loading = false,
  href,
  className,
}: Props) {
  const body = (
    <>
      <div className="flex min-w-0 shrink-0 items-center gap-2.5">
        <span
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center",
            exRadius[12],
            toneSoft(tone),
          )}
        >
          <DsIcon icon={Icon} size="md" />
        </span>
        <p
          className={cn(
            exTypography.label,
            "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap tracking-[0.08em] uppercase",
          )}
        >
          {title}
        </p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden">
        {loading ? (
          <div
            className={cn(
              "h-8 w-3/4 rounded-md bg-muted/60",
              exAnimations.shimmer,
            )}
            aria-hidden
          />
        ) : (
          <p
            key={value}
            className={cn(
              exTypography.metricSm,
              toneText(tone),
              "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap leading-none",
              exAnimations.count,
            )}
            title={value}
          >
            {value}
          </p>
        )}
        {supportingText ? (
          <p
            className={cn(
              exTypography.caption,
              "mt-1.5 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground",
            )}
          >
            {supportingText}
          </p>
        ) : null}
        {trend ? (
          <p
            className={cn(
              exTypography.caption,
              "mt-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap",
              trend.direction === "up" && "text-emerald-700 dark:text-emerald-400",
              trend.direction === "down" && "text-rose-700 dark:text-rose-400",
              (!trend.direction || trend.direction === "flat") &&
                "text-muted-foreground",
            )}
          >
            {trend.label}
          </p>
        ) : null}
      </div>

      {progress ? (
        <div className="min-w-0 shrink-0 overflow-hidden">
          <ProgressBar progress={progress} />
        </div>
      ) : null}
    </>
  );

  const shellClass = cn(
    "flex h-[10.5rem] min-w-0 w-full max-w-full flex-col overflow-hidden bg-card",
    "border border-border/40 ring-1 ring-black/[0.02] dark:border-border/50 dark:ring-white/[0.04]",
    exRadius[16],
    exShadow.card,
    "px-6 py-5 sm:px-7",
    "motion-safe:transition-[box-shadow,border-color,transform] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)]",
    "motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-border/65",
    exShadow.cardHover,
    exAnimations.slide,
    href && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shellClass} aria-label={`${title}: ${value}`}>
        {body}
      </Link>
    );
  }

  return (
    <article className={shellClass} aria-label={`${title}: ${value}`}>
      {body}
    </article>
  );
}

export function ExecutiveKpiCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-[10.5rem] min-w-0 w-full flex-col border border-border/40 bg-card px-6 py-5",
        exRadius[16],
        exAnimations.shimmer,
        className,
      )}
      aria-busy="true"
      aria-label="Carregando indicador"
    />
  );
}
