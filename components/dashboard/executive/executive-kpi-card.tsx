import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { ExecutiveBadge, ExecutiveSkeleton } from "@/components/executive";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  gofColors,
  gofFocusRing,
  gofMotion,
  gofRadius,
  gofTypography,
} from "@/lib/design-system";
import { gofCardSurface, gofInteractive } from "@/lib/design-system/primitives";
import { cn } from "@/lib/utils";

export type ExecutiveKpiTrend = {
  label: string;
  direction?: "up" | "down" | "flat";
};

export type ExecutiveKpiProgress = {
  value: number | null;
  label?: string;
};

type KpiTone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";

type Props = {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: KpiTone;
  supportingText?: string;
  trend?: ExecutiveKpiTrend;
  progress?: ExecutiveKpiProgress;
  statusLabel?: string;
  loading?: boolean;
  href?: string;
  className?: string;
};

function toneText(tone: KpiTone) {
  if (tone === "neutral") return "text-foreground";
  return gofColors[tone].text;
}

function toneSoft(tone: KpiTone) {
  if (tone === "neutral") return "bg-muted/70 text-muted-foreground";
  return gofColors[tone].soft;
}

function badgeTone(
  tone: KpiTone,
): "success" | "warning" | "danger" | "info" | "neutral" | "primary" {
  if (tone === "primary") return "primary";
  return tone;
}

function ProgressBar({ progress }: { progress: ExecutiveKpiProgress }) {
  if (progress.value == null) {
    return <div className="h-1.5 w-full rounded-full bg-muted" aria-hidden />;
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
            "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-200",
            pct >= 100
              ? "bg-success"
              : pct >= 80
                ? "bg-[var(--brand-info)]"
                : "bg-danger",
          )}
          style={{ width: `${fill}%` }}
        />
      </div>
      {progress.label ? (
        <p className={gofTypography.caption}>{progress.label}</p>
      ) : null}
    </div>
  );
}

function TrendIcon({ direction }: { direction?: "up" | "down" | "flat" }) {
  if (direction === "up")
    return <TrendingUp className="size-3.5 shrink-0" aria-hidden />;
  if (direction === "down")
    return <TrendingDown className="size-3.5 shrink-0" aria-hidden />;
  return <Minus className="size-3.5 shrink-0" aria-hidden />;
}

/**
 * KPI Card premium — Gate 19.3 (valores maiores, títulos discretos, badge/tendência).
 * Sem alterar dados.
 */
export function ExecutiveKpiCard({
  title,
  value,
  icon: Icon,
  tone = "neutral",
  supportingText,
  trend,
  progress,
  statusLabel,
  loading = false,
  href,
  className,
}: Props) {
  if (loading) {
    return <ExecutiveKpiCardSkeleton className={className} />;
  }

  const body = (
    <div className="flex h-full min-h-[10.5rem] min-w-0 flex-col gap-4">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center",
              gofRadius.md,
              toneSoft(tone),
            )}
          >
            <DsIcon icon={Icon} size="sm" />
          </span>
          <p
            className={cn(
              gofTypography.caption,
              "min-w-0 flex-1 truncate font-medium uppercase tracking-[0.1em] text-muted-foreground",
            )}
          >
            {title}
          </p>
        </div>
        {statusLabel ? (
          <ExecutiveBadge tone={badgeTone(tone)} variant="soft" className="shrink-0">
            {statusLabel}
          </ExecutiveBadge>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-3xl font-semibold tabular-nums leading-none tracking-tight sm:text-[2rem]",
            toneText(tone),
          )}
          title={value}
        >
          {value}
        </p>
        {supportingText ? (
          <p
            className={cn(
              gofTypography.caption,
              "mt-2 truncate text-muted-foreground",
            )}
          >
            {supportingText}
          </p>
        ) : null}
        {trend ? (
          <p
            className={cn(
              gofTypography.caption,
              "mt-1.5 inline-flex max-w-full items-center gap-1 truncate",
              trend.direction === "up" && "text-success",
              trend.direction === "down" && "text-danger",
              (!trend.direction || trend.direction === "flat") &&
                "text-muted-foreground",
            )}
          >
            <TrendIcon direction={trend.direction} />
            <span className="truncate">{trend.label}</span>
          </p>
        ) : null}
      </div>

      {progress ? <ProgressBar progress={progress} /> : null}
    </div>
  );

  const shellClass = cn(
    gofCardSurface,
    "flex h-[11.25rem] min-w-0 w-full max-w-full flex-col overflow-hidden p-5 sm:p-6",
    gofMotion.fade,
    href && cn(gofFocusRing, gofInteractive),
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
        gofCardSurface,
        "flex h-[11.25rem] min-w-0 w-full flex-col gap-4 p-5 sm:p-6",
        className,
      )}
      aria-busy="true"
      aria-label="Carregando indicador"
    >
      <ExecutiveSkeleton
        heightClassName="h-9"
        widthClassName="w-9"
        rounded="md"
      />
      <ExecutiveSkeleton heightClassName="h-9" widthClassName="w-2/3" />
      <ExecutiveSkeleton heightClassName="h-2" widthClassName="w-full" />
    </div>
  );
}
