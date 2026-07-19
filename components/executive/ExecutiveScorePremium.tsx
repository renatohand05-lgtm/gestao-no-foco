import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { DsIcon } from "@/components/ui/ds-icon";
import { exAnimations, exSize, exTypography } from "@/lib/design-system";
import { formatPercent } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";
import type { ExecutiveScoreResult } from "@/lib/intelligence/types";
import type { DashboardTrend } from "@/types/dashboard-executive";

const SCORE_STATUS_LABEL: Record<ExecutiveScoreResult["status"], string> = {
  critico: "Crítico",
  atencao: "Atenção",
  bom: "Bom",
  excelente: "Excelente",
  sem_meta: "Sem meta",
  periodo_futuro: "Futuro",
  dados_insuficientes: "Insuficiente",
};

type Props = {
  score: ExecutiveScoreResult;
  fallbackValue?: number;
  confidenceLabel: string;
  trendPct?: number | null;
  trend?: DashboardTrend | null;
  inverse?: boolean;
  className?: string;
  /** Protagonista do Hero (Sprint 13.10). */
  featured?: boolean;
};

/**
 * Executive Score Premium — protagonista visual do cockpit (Sprint 13.10).
 * Sem alteração do cálculo — só hierarquia e composição.
 */
export function ExecutiveScorePremium({
  score,
  fallbackValue = 0,
  confidenceLabel,
  trendPct = null,
  trend = null,
  inverse = false,
  className,
  featured = false,
}: Props) {
  const value = score.score ?? fallbackValue;
  const display = score.score === null ? "—" : Math.round(score.score);
  const pct = Math.min(Math.max(value, 0), 100);
  const statusLabel = SCORE_STATUS_LABEL[score.status];
  const TrendIcon =
    trend === "up"
      ? ArrowUpRight
      : trend === "down"
        ? ArrowDownRight
        : ArrowRight;

  const radius = 46;
  const circumference = Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        featured
          ? "items-center text-center lg:items-start lg:text-left"
          : "justify-center",
        exAnimations.scale,
        className,
      )}
      role="img"
      aria-label={`Executive Score ${display}. ${statusLabel}. ${confidenceLabel}`}
    >
      <p
        className={cn(
          exTypography.label,
          inverse ? "text-white/55" : "text-muted-foreground",
        )}
      >
        Executive Score
      </p>

      {featured ? (
        <div className={cn("relative mt-2", exSize.scoreGauge)}>
          <svg
            viewBox="0 0 100 62"
            className="h-auto w-full overflow-visible"
            aria-hidden
          >
            <path
              d="M 6 54 A 46 46 0 0 1 94 54"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className={inverse ? "stroke-white/12" : "stroke-muted/50"}
            />
            <path
              d="M 6 54 A 46 46 0 0 1 94 54"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className={cn(
                inverse ? "stroke-sky-300" : "stroke-slate-800 dark:stroke-white/80",
                exAnimations.progress,
              )}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-0.5">
            <p
              className={cn(
                exTypography.scoreHero,
                "leading-none",
                inverse && "text-white",
              )}
            >
              {display}
            </p>
          </div>
        </div>
      ) : (
        <p
          className={cn(
            exTypography.metricXl,
            "leading-none",
            inverse && "text-white",
          )}
        >
          {display}
        </p>
      )}

      <p
        className={cn(
          featured ? exTypography.heading : exTypography.title,
          "mt-3",
          inverse ? "text-white" : "text-foreground",
        )}
      >
        {statusLabel}
      </p>

      <p
        className={cn(
          exTypography.caption,
          "mt-1",
          inverse ? "text-white/55" : undefined,
        )}
      >
        {confidenceLabel}
      </p>

      {trendPct !== null && trend ? (
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1",
            exTypography.caption,
            inverse ? "text-white/60" : "text-muted-foreground",
          )}
        >
          <DsIcon icon={TrendIcon} size="xs" className="text-current" />
          <span className="tabular-nums">
            {formatPercent(trendPct)} vs período
          </span>
        </p>
      ) : null}

      <div
        className={cn(
          "mt-4 h-1.5 w-full overflow-hidden rounded-full",
          exSize.scoreBar,
          inverse ? "bg-white/12" : "bg-slate-200/80 dark:bg-white/10",
        )}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do Executive Score"
      >
        <div
          className={cn(
            "h-full rounded-full",
            inverse ? "bg-sky-300" : "bg-slate-800 dark:bg-white/70",
            exAnimations.progress,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
