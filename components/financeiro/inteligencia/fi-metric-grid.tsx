"use client";

import { memo } from "react";

import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { cn } from "@/lib/utils";
import type { FiMetricCard, FiTone } from "@/lib/financial-intelligence/types";

function toneValueClass(tone: FiTone) {
  if (tone === "positive") return "text-emerald-700 dark:text-emerald-400";
  if (tone === "negative") return "text-rose-700 dark:text-rose-400";
  if (tone === "warning") return "text-amber-700 dark:text-amber-400";
  return undefined;
}

function FiMetricGridComponent({
  metrics,
  columnsClassName = "md:grid-cols-2 xl:grid-cols-4",
}: {
  metrics: FiMetricCard[];
  columnsClassName?: string;
}) {
  return (
    <div className={cn("grid gap-4", columnsClassName)}>
      {metrics.map((metric) => (
        <DashboardKpiCard
          key={metric.key}
          title={metric.label}
          value={metric.formatted}
          tooltip={
            metric.available
              ? metric.tooltip
              : `${metric.tooltip} ${metric.unavailableReason ?? ""}`.trim()
          }
          hint={metric.available ? "Como é calculado" : "Indisponível"}
          comparison={metric.available ? metric.comparison : undefined}
          previousFormatted={
            metric.available ? metric.previousFormatted : undefined
          }
          comparisonHint="vs período anterior equivalente"
          href={metric.available ? metric.href : undefined}
          valueClassName={toneValueClass(metric.trendTone)}
          ariaLabel={`${metric.label}: ${metric.formatted}`}
        />
      ))}
    </div>
  );
}

export const FiMetricGrid = memo(FiMetricGridComponent);
