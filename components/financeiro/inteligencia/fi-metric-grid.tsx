"use client";

import Link from "next/link";
import { memo } from "react";

import { MetricCard } from "@/components/executive";
import type { ExColorTone } from "@/lib/design-system/colors";
import { gofGrid } from "@/lib/design-system";
import { formatVariationPct } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";
import type { FiMetricCard, FiTone } from "@/lib/financial-intelligence/types";

function mapTone(tone: FiTone): ExColorTone {
  if (tone === "positive") return "success";
  if (tone === "negative") return "danger";
  if (tone === "warning") return "warning";
  return "neutral";
}

function FiMetricGridComponent({
  metrics,
  columnsClassName,
}: {
  metrics: FiMetricCard[];
  /** @deprecated Prefer gofGrid.metrics — mantido para compatibilidade de chamada */
  columnsClassName?: string;
}) {
  return (
    <div
      className={cn(columnsClassName ?? gofGrid.metrics)}
      data-financeiro-block="inteligencia-kpis"
    >
      {metrics.map((metric) => {
        const hintParts: string[] = [];
        if (metric.available) {
          if (metric.tooltip) hintParts.push(metric.tooltip);
          if (metric.comparison) {
            const delta = formatVariationPct(metric.comparison.variationPct);
            const prev = metric.previousFormatted
              ? ` · ant. ${metric.previousFormatted}`
              : "";
            hintParts.push(`vs período anterior: ${delta}${prev}`);
          }
        } else {
          hintParts.push(
            [metric.tooltip, metric.unavailableReason]
              .filter(Boolean)
              .join(" ")
              .trim() || "Indisponível",
          );
        }

        const card = (
          <MetricCard
            label={metric.label}
            value={metric.formatted}
            hint={hintParts.filter(Boolean).join(" · ") || undefined}
            tone={metric.available ? mapTone(metric.trendTone) : "neutral"}
            emphasize={
              metric.key === "resultado_liquido" || metric.key === "ebitda"
            }
            className="h-full"
          />
        );

        if (metric.available && metric.href) {
          return (
            <Link
              key={metric.key}
              href={metric.href}
              className="block h-full min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40"
              aria-label={`${metric.label}: ${metric.formatted}`}
            >
              {card}
            </Link>
          );
        }

        return (
          <div
            key={metric.key}
            aria-label={`${metric.label}: ${metric.formatted}`}
          >
            {card}
          </div>
        );
      })}
    </div>
  );
}

export const FiMetricGrid = memo(FiMetricGridComponent);
