"use client";

import Link from "next/link";
import {
  Banknote,
  CircleDollarSign,
  Gauge,
  LineChart,
  Target,
  TrendingDown,
  TrendingUp,
  Minus,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { GFIcon } from "@/components/gf/gf-icon";
import { GFMetric } from "@/components/gf/gf-metric";
import type { PremiumKpiItem } from "@/lib/dashboard/premium-dashboard-map";
import { gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  faturamento: CircleDollarSign,
  lucro: Banknote,
  margem: Gauge,
  ebitda: LineChart,
  caixa: Wallet,
  meta: Target,
};

function TrendIcon({ direction }: { direction?: "up" | "down" | "flat" }) {
  if (direction === "up")
    return <TrendingUp className="size-3 shrink-0" aria-hidden />;
  if (direction === "down")
    return <TrendingDown className="size-3 shrink-0" aria-hidden />;
  return <Minus className="size-3 shrink-0" aria-hidden />;
}

type CellProps = {
  item: PremiumKpiItem;
  featured?: boolean;
};

function KpiCell({ item, featured = false }: CellProps) {
  const Icon = ICONS[item.id] ?? CircleDollarSign;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className={cn(gfType.overline)} data-kpi-title="">
          {item.title}
        </p>
        <GFIcon
          icon={Icon}
          size={featured ? "md" : "sm"}
          variant={featured ? "intelligence" : "primary"}
        />
      </div>
      <GFMetric
        value={item.value}
        size={featured ? "xl" : "lg"}
        unavailable={item.unavailable}
        className="mt-2"
      />
      {item.supportingText ? (
        <p className={cn(gfType.caption, "mt-1.5 line-clamp-2 text-pretty")}>
          {item.supportingText}
        </p>
      ) : null}
      {item.trend ? (
        <p
          className={cn(
            "mt-1.5 inline-flex items-center gap-1 text-[11px]",
            item.trend.direction === "up" && "text-success",
            item.trend.direction === "down" && "text-danger",
            (!item.trend.direction || item.trend.direction === "flat") &&
              "text-[var(--text-muted)]",
          )}
        >
          <TrendIcon direction={item.trend.direction} />
          <span className="truncate">{item.trend.label}</span>
        </p>
      ) : null}
    </>
  );

  const cellClass = cn(
    "gf-kpi gf-kpi-cockpit-cell relative flex min-h-[7.5rem] min-w-0 flex-col p-3.5 sm:p-4",
    "premium-kpi-lift",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40 focus-visible:z-[1]",
    featured &&
      "bg-[linear-gradient(165deg,rgb(201_168_76_/0.1),transparent_55%)] md:min-h-[8.5rem]",
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={cellClass}
        data-kpi-card=""
        data-kpi-featured={featured ? "1" : "0"}
        data-kpi-v2=""
        aria-label={`${item.title}: ${item.value}`}
      >
        {body}
      </Link>
    );
  }

  return (
    <article
      className={cellClass}
      data-kpi-card=""
      data-kpi-featured={featured ? "1" : "0"}
      data-kpi-v2=""
      aria-label={`${item.title}: ${item.value}`}
    >
      {body}
    </article>
  );
}

type Props = {
  items: PremiumKpiItem[];
  /** Índice do KPI featured (default 0 = faturamento). */
  featuredIndex?: number;
  className?: string;
};

/**
 * Faixa executiva unificada — uma superfície, divisores discretos (Sprint 26.2).
 */
export function GFKpiCockpit({
  items,
  featuredIndex = 0,
  className,
}: Props) {
  return (
    <section
      aria-label="Indicadores executivos"
      data-premium-block="kpi-strip"
      data-dashboard-layout="kpi-grid"
      data-kpi-dominant="1"
      data-premium-kpis="v2"
      data-gf-kpi-cockpit=""
      data-sprint="26.2.1"
      className={cn(
        "gf-kpi-cockpit overflow-hidden rounded-[var(--gf-radius)]",
        "border border-border bg-card shadow-[var(--elevation-card)]",
        className,
      )}
    >
      <div
        className={cn(
          "grid grid-cols-1 divide-y divide-border",
          "sm:grid-cols-2 sm:divide-x sm:divide-y-0",
          "md:grid-cols-3 lg:grid-cols-3",
          "lg:[&>*:nth-child(n+4)]:border-t lg:[&>*:nth-child(n+4)]:border-border",
          "2xl:grid-cols-6 2xl:divide-y-0 2xl:[&>*:nth-child(n+4)]:border-t-0",
        )}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "min-w-0",
              /* notebook 3×2: divisores internos */
              "md:[&:nth-child(3n)]:border-r-0",
              "2xl:border-r 2xl:border-border 2xl:last:border-r-0",
              index > 0 && "sm:border-l sm:border-border",
              index >= 2 && "md:border-l-0 md:[&:nth-child(3n+1)]:border-l-0",
            )}
          >
            <KpiCell item={item} featured={index === featuredIndex} />
          </div>
        ))}
      </div>
    </section>
  );
}
