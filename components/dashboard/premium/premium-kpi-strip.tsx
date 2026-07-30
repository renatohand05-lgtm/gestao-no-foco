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

import type { PremiumKpiItem } from "@/lib/dashboard/premium-dashboard-map";
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
    return <TrendingUp className="size-3.5 shrink-0" aria-hidden />;
  if (direction === "down")
    return <TrendingDown className="size-3.5 shrink-0" aria-hidden />;
  return <Minus className="size-3.5 shrink-0" aria-hidden />;
}

/**
 * KPI premium reconstruído (Sprint 25.6.1).
 * Sem ellipsis em título/valor; moeda em linha única.
 * Notebook: 3×2 (lg); Desktop largo: 6 (2xl ≥1536).
 */
export function PremiumKpiCard({ item }: { item: PremiumKpiItem }) {
  const Icon = ICONS[item.id] ?? CircleDollarSign;
  const body = (
    <>
      <div className="flex items-start gap-2.5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-gold)]/12 text-[var(--brand-gold)]">
          <Icon className="size-4" aria-hidden />
        </span>
        <p
          className="min-w-0 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase text-pretty"
          data-kpi-title=""
        >
          {item.title}
        </p>
      </div>

      <p
        className={cn(
          "mt-3 font-semibold tracking-tight text-foreground",
          "whitespace-nowrap tabular-nums",
          "text-[clamp(1.05rem,0.85rem+0.55vw,1.55rem)]",
          "overflow-x-clip",
          item.unavailable && "text-muted-foreground",
        )}
        data-kpi-value=""
        title={item.value}
      >
        {item.value}
      </p>

      {item.supportingText ? (
        <p className="mt-2 text-xs text-muted-foreground text-pretty">
          {item.supportingText}
        </p>
      ) : null}

      {item.trend ? (
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs",
            item.trend.direction === "up" && "text-success",
            item.trend.direction === "down" && "text-danger",
            (!item.trend.direction || item.trend.direction === "flat") &&
              "text-muted-foreground",
          )}
        >
          <TrendIcon direction={item.trend.direction} />
          <span>{item.trend.label}</span>
        </p>
      ) : null}
    </>
  );

  const shell = cn(
    "flex min-h-[8.5rem] min-w-0 flex-col rounded-2xl border border-[var(--border-premium)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-card)]",
    "dark:bg-[var(--brand-graphite-elevated)]/85",
    "premium-kpi-lift hover:border-[var(--brand-gold)]/40",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={shell}
        data-kpi-card=""
        aria-label={`${item.title}: ${item.value}`}
      >
        {body}
      </Link>
    );
  }

  return (
    <article className={shell} data-kpi-card="" aria-label={`${item.title}: ${item.value}`}>
      {body}
    </article>
  );
}

/**
 * Grid KPI — 2xl:6 · lg:3 · md:2 · sm:1
 * (2xl = desktop largo ≥1536; notebook 1366/1440 fica em 3×2).
 */
export function PremiumKpiStrip({ items }: { items: PremiumKpiItem[] }) {
  return (
    <section
      aria-label="Indicadores executivos"
      data-premium-block="kpi-strip"
      data-dashboard-layout="kpi-grid"
      className="grid grid-cols-1 gap-[var(--dashboard-gap)] md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
    >
      {items.map((item) => (
        <PremiumKpiCard key={item.id} item={item} />
      ))}
    </section>
  );
}

export function PremiumOpsStrip({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    value: string;
    hint: string;
    href: string;
    unavailable?: boolean;
  }>;
}) {
  return (
    <section
      aria-label="Blocos operacionais"
      data-premium-block="ops-strip"
      className="grid grid-cols-1 gap-[var(--dashboard-gap)] sm:grid-cols-2 xl:grid-cols-4"
    >
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={cn(
            "rounded-2xl border border-border/50 bg-[var(--surface-2)] p-4 transition-colors",
            "hover:border-[var(--brand-gold)]/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
          )}
        >
          <p className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {item.title}
          </p>
          <p
            className={cn(
              "mt-2 whitespace-nowrap text-2xl font-semibold tabular-nums tracking-tight",
              item.unavailable && "text-muted-foreground",
            )}
          >
            {item.value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground text-pretty">
            {item.hint}
          </p>
        </Link>
      ))}
    </section>
  );
}
