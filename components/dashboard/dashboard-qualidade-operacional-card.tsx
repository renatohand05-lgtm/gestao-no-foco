"use client";

import Link from "next/link";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { memo } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatNumber,
  formatPercent,
  formatVariationPct,
} from "@/lib/dashboard/format";
import {
  dsIconBox,
  dsIconSize,
  dsInteractive,
  dsPadding,
  dsRadius,
  dsShadow,
  dsSpace,
  dsStatus,
  dsTrendTone,
  dsType,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { RetornoServicosKpi } from "@/types/qualidade-operacional";

type DashboardQualidadeOperacionalCardProps = {
  tenantSlug: string;
  kpi: RetornoServicosKpi;
  href: string;
};

function statusClasses(status: RetornoServicosKpi["statusCor"]) {
  switch (status) {
    case "verde":
      return {
        ring: cn(dsStatus.success.border, "bg-emerald-500/5"),
        value: dsStatus.success.text,
        badge: dsStatus.success.soft,
      };
    case "amarelo":
      return {
        ring: cn(dsStatus.warning.border, "bg-amber-500/5"),
        value: dsStatus.warning.text,
        badge: dsStatus.warning.soft,
      };
    case "vermelho":
      return {
        ring: cn(dsStatus.danger.border, "bg-rose-500/5"),
        value: dsStatus.danger.text,
        badge: dsStatus.danger.soft,
      };
  }
}

function DashboardQualidadeOperacionalCardComponent({
  kpi,
  href,
}: DashboardQualidadeOperacionalCardProps) {
  const tone = statusClasses(kpi.statusCor);
  const trendInverted =
    kpi.comparison.trend === "up"
      ? "down"
      : kpi.comparison.trend === "down"
        ? "up"
        : "neutral";

  return (
    <TooltipProvider delay={200}>
      <Link
        href={href}
        className={cn(
          "group relative col-span-full overflow-hidden border sm:col-span-2 xl:col-span-1",
          dsRadius.lg,
          dsPadding.card,
          dsShadow.sm,
          dsInteractive.hoverLift,
          dsInteractive.focusCard,
          tone.ring,
        )}
        aria-label="Abrir Qualidade Operacional — Retorno de Serviços"
      >
        <div className="flex items-start justify-between gap-3">
          <div className={dsSpace.stackXs}>
            <p className={dsType.eyebrow}>Qualidade Operacional</p>
            <Tooltip>
              <TooltipTrigger className="cursor-help text-left text-sm font-medium text-foreground underline decoration-dotted underline-offset-4">
                Retorno de Serviços
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className={cn("max-w-xs text-left", dsType.tooltip)}
              >
                Percentual de retornos sobre serviços concluídos no período.
                Meta operacional: abaixo de {kpi.metaPct}%.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className={dsIconBox.md}>
            <RotateCcw className={dsIconSize.md} aria-hidden />
          </div>
        </div>

        <p className={cn("mt-3", dsType.kpiValueLg, tone.value)}>
          {formatPercent(kpi.taxaRetornoPct)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "px-2 py-0.5 tabular-nums",
              dsRadius.badge,
              dsType.badge,
              tone.badge,
            )}
          >
            Meta &lt;{formatPercent(kpi.metaPct)}
          </span>
          <span
            className={cn(
              "px-2 py-0.5 tabular-nums",
              dsRadius.badge,
              dsType.badge,
              dsTrendTone(trendInverted),
            )}
            aria-label={`Variação ${formatVariationPct(kpi.comparison.variationPct)}`}
          >
            {formatVariationPct(kpi.comparison.variationPct)} vs período anterior
          </span>
        </div>

        <p className={cn("mt-3", dsType.legend)}>
          {formatNumber(kpi.quantidadeRetornos)} retornos ·{" "}
          {formatNumber(kpi.totalServicosConcluidos)} serviços concluídos
        </p>

        <div
          className={cn(
            "mt-4 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
            dsType.badge,
            dsStatus.success.text,
          )}
        >
          Ver drill-down
          <ArrowUpRight className={dsIconSize.sm} aria-hidden />
        </div>
      </Link>
    </TooltipProvider>
  );
}

export const DashboardQualidadeOperacionalCard = memo(
  DashboardQualidadeOperacionalCardComponent,
);
