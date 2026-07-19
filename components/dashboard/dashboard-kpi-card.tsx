"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Calculator,
  Minus,
  Percent,
  Receipt,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { memo } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatVariationPct } from "@/lib/dashboard/format";
import {
  dsElevation,
  dsIconBox,
  dsIconSize,
  dsInteractive,
  dsMotion,
  dsPadding,
  dsRadius,
  dsSpace,
  dsStatus,
  dsTrendTone,
  dsType,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
  DashboardKpiComparison,
  DashboardTrend,
} from "@/types/dashboard-executive";

export type DashboardKpiIconKey =
  | "revenue"
  | "net-revenue"
  | "ebitda"
  | "cmv"
  | "margin"
  | "cash"
  | "receivables"
  | "payables"
  | "inflow"
  | "outflow"
  | "ticket"
  | "sales"
  | "customers";

const KPI_ICON_MAP: Record<DashboardKpiIconKey, LucideIcon> = {
  revenue: TrendingUp,
  "net-revenue": Banknote,
  ebitda: Calculator,
  cmv: Receipt,
  margin: Percent,
  cash: Wallet,
  receivables: ArrowDownLeft,
  payables: ArrowUpRight,
  inflow: ArrowDownLeft,
  outflow: ArrowUpRight,
  ticket: ShoppingCart,
  sales: ShoppingCart,
  customers: Users,
};

type DashboardKpiCardProps = {
  title: string;
  value: string;
  hint?: string;
  tooltip?: string;
  icon?: DashboardKpiIconKey;
  valueClassName?: string;
  className?: string;
  comparison?: DashboardKpiComparison;
  previousFormatted?: string;
  comparisonHint?: string;
  href?: string;
  ariaLabel?: string;
};

function TrendIcon({ trend }: { trend: DashboardTrend }) {
  if (trend === "up")
    return <TrendingUp className={dsIconSize.sm} aria-hidden />;
  if (trend === "down")
    return <TrendingDown className={dsIconSize.sm} aria-hidden />;
  return <Minus className={dsIconSize.sm} aria-hidden />;
}

function DashboardKpiCardComponent({
  title,
  value,
  hint,
  tooltip,
  icon,
  valueClassName,
  className,
  comparison,
  previousFormatted,
  comparisonHint,
  href,
  ariaLabel,
}: DashboardKpiCardProps) {
  const Icon = icon ? KPI_ICON_MAP[icon] : null;

  const cardContent = (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.06),transparent_55%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div className={dsSpace.stackXs}>
          <p className={dsType.kpiLabel}>{title}</p>
          {tooltip ? (
            <Tooltip>
              <TooltipTrigger
                className={cn(
                  "cursor-help text-left underline decoration-dotted underline-offset-4",
                  dsType.legend,
                  "text-muted-foreground/80",
                )}
                aria-label={`Saiba mais sobre ${title}`}
              >
                {hint ?? "Como é calculado"}
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className={cn("max-w-xs text-left leading-relaxed", dsType.tooltip)}
              >
                {tooltip}
              </TooltipContent>
            </Tooltip>
          ) : hint ? (
            <p className={cn("max-w-[18rem]", dsType.legend)}>{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className={dsIconBox.md}>
            <Icon className={dsIconSize.lg} aria-hidden />
          </div>
        ) : null}
      </div>

      <p className={cn("relative mt-4", dsType.kpiValueLg, valueClassName)}>
        {value}
      </p>

      {comparison ? (
        <div className={cn("relative mt-3", dsSpace.stackSm)}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 tabular-nums",
                dsRadius.badge,
                dsType.badge,
                dsTrendTone(comparison.trend),
              )}
              aria-label={`Variação ${formatVariationPct(comparison.variationPct)}`}
            >
              <TrendIcon trend={comparison.trend} />
              {formatVariationPct(comparison.variationPct)}
            </span>
            {previousFormatted ? (
              <span className={cn(dsType.legend, "tabular-nums")}>
                ant. {previousFormatted}
              </span>
            ) : null}
          </div>
          {comparisonHint ? (
            <p className={dsType.caption}>{comparisonHint}</p>
          ) : null}
        </div>
      ) : null}

      {href ? (
        <div
          className={cn(
            "relative mt-5 flex items-center gap-1.5 opacity-70 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100",
            dsType.badge,
            dsStatus.success.text,
          )}
        >
          Explorar detalhes
          <ArrowUpRight className={dsIconSize.sm} aria-hidden />
        </div>
      ) : null}
    </>
  );

  const cardClassName = cn(
    "group relative overflow-hidden",
    dsRadius.lg,
    dsElevation.cardPremium,
    dsPadding.card,
    dsMotion.fadeIn,
    href &&
      cn(
        "cursor-pointer",
        dsInteractive.focusCard,
        "focus-within:ring-2 focus-within:ring-primary/40",
      ),
    className,
  );

  if (href) {
    return (
      <TooltipProvider delay={150}>
        <Link
          href={href}
          className={cardClassName}
          aria-label={ariaLabel ?? `Abrir ${title}`}
        >
          {cardContent}
        </Link>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delay={150}>
      <article className={cardClassName} aria-label={ariaLabel ?? title}>
        {cardContent}
      </article>
    </TooltipProvider>
  );
}

export const DashboardKpiCard = memo(DashboardKpiCardComponent);
