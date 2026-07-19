import { Activity, AlertTriangle, CheckCircle2, HeartPulse } from "lucide-react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";
import {
  dsElevation,
  dsIconSize,
  dsMotion,
  dsPadding,
  dsRadius,
  dsSpace,
  dsStatus,
  dsType,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { HealthScoreResult } from "@/types/intelligence";

const BANDS = [
  { key: "Excelente", min: 85, tone: dsStatus.success },
  { key: "Bom", min: 70, tone: dsStatus.info },
  { key: "Atenção", min: 50, tone: dsStatus.warning },
  { key: "Crítico", min: 0, tone: dsStatus.danger },
] as const;

function labelTone(label: HealthScoreResult["label"]) {
  switch (label) {
    case "Excelente":
      return dsStatus.success.text;
    case "Saudável":
      return dsStatus.info.text;
    case "Atenção":
      return dsStatus.warning.text;
    case "Crítico":
      return "text-orange-700 dark:text-orange-400";
    case "Emergência":
      return dsStatus.danger.text;
  }
}

function ringTone(label: HealthScoreResult["label"]) {
  switch (label) {
    case "Excelente":
      return "stroke-emerald-500";
    case "Saudável":
      return "stroke-sky-500";
    case "Atenção":
      return "stroke-amber-500";
    case "Crítico":
      return "stroke-orange-500";
    case "Emergência":
      return "stroke-rose-500";
  }
}

function displayBand(label: HealthScoreResult["label"]) {
  return label === "Saudável" ? "Bom" : label;
}

type Props = {
  health: HealthScoreResult;
};

export function DashboardHealthScore({ health }: Props) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (health.score / 100) * circumference;

  return (
    <DashboardSection
      title="Health Score"
      description="Saúde geral calculada com EBITDA, fluxo, CMV, margem, títulos, estoque e crescimento"
      className={dsMotion.fadeUp}
    >
      <div className="grid gap-6 lg:grid-cols-[200px_1fr] lg:items-center">
        <div className="relative mx-auto flex size-44 items-center justify-center">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90 drop-shadow-sm">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="7"
              className="stroke-muted"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn(ringTone(health.label), dsMotion.progress)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <HeartPulse
              className={cn("mb-1", dsIconSize.md, labelTone(health.label))}
            />
            <p className="text-4xl font-semibold tabular-nums tracking-tight">
              {health.score}
            </p>
            <p className={cn(dsType.badge, labelTone(health.label))}>
              {displayBand(health.label)}
            </p>
          </div>
        </div>

        <div className={dsSpace.section}>
          <div className="flex flex-wrap gap-2">
            {BANDS.map((band) => (
              <span
                key={band.key}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1",
                  dsRadius.badge,
                  dsType.caption,
                  band.tone.soft,
                )}
              >
                <span className="font-medium">{band.key}</span>
                <span className="opacity-70">≥ {band.min}</span>
              </span>
            ))}
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {health.factors.map((factor) => (
              <li
                key={factor.id}
                className={cn(
                  dsElevation.cardMuted,
                  dsRadius.md,
                  dsPadding.cardXs,
                  dsMotion.hover,
                  "hover:bg-muted/35",
                )}
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{factor.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {Math.round(factor.score)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/70">
                  <div
                    className={cn(
                      "h-full rounded-full bg-emerald-500/80",
                      dsMotion.progress,
                    )}
                    style={{ width: `${Math.max(factor.score, 4)}%` }}
                  />
                </div>
                <p className={cn("mt-1.5", dsType.legend)}>{factor.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardSection>
  );
}

export function DashboardPriorityIcon({
  priority,
}: {
  priority: "critical" | "high" | "medium" | "low" | "info";
}) {
  if (priority === "critical" || priority === "high") {
    return (
      <AlertTriangle className={cn(dsIconSize.md, dsStatus.danger.solid)} />
    );
  }
  if (priority === "info") {
    return (
      <CheckCircle2 className={cn(dsIconSize.md, dsStatus.success.solid)} />
    );
  }
  return <Activity className={cn(dsIconSize.md, dsStatus.warning.solid)} />;
}
