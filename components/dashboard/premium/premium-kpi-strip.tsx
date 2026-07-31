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
import { GFKpiCockpit } from "@/components/gf/gf-kpi-cockpit";
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
 * KPI premium v2 (Sprint 26.1) — valor dominante, tipografia hierárquica.
 */
export function PremiumKpiCard({
  item,
  featured = false,
}: {
  item: PremiumKpiItem;
  featured?: boolean;
}) {
  const Icon = ICONS[item.id] ?? CircleDollarSign;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p
          className="min-w-0 text-[11px] font-medium tracking-[0.1em] text-[var(--text-muted)] uppercase text-pretty"
          data-kpi-title=""
        >
          {item.title}
        </p>
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--brand-gold)]/12 text-[var(--brand-gold)]",
            featured ? "size-10" : "size-8",
          )}
        >
          <Icon className={featured ? "size-5" : "size-3.5"} aria-hidden />
        </span>
      </div>

      <p
        className={cn(
          "mt-auto font-semibold tracking-tight text-[var(--text-primary)]",
          "whitespace-nowrap tabular-nums",
          "overflow-x-clip",
          featured
            ? "text-[clamp(1.55rem,1.15rem+1.1vw,2.35rem)] leading-none"
            : "text-[clamp(1.2rem,0.95rem+0.7vw,1.75rem)] leading-none",
          item.unavailable && "text-[var(--text-muted)]",
        )}
        data-kpi-value=""
        data-kpi-dominant={featured ? "1" : "0"}
        title={item.value}
      >
        {item.value}
      </p>

      {item.supportingText ? (
        <p className="mt-2 text-xs text-[var(--text-secondary)] text-pretty">
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
              "text-[var(--text-muted)]",
          )}
        >
          <TrendIcon direction={item.trend.direction} />
          <span>{item.trend.label}</span>
        </p>
      ) : null}
    </>
  );

  const shell = cn(
    "gf-kpi flex min-w-0 flex-col rounded-2xl border p-4",
    "border-[var(--border-premium)] bg-[var(--surface-raised)] shadow-[var(--shadow-card)]",
    "dark:bg-[var(--brand-graphite-elevated)]/85",
    "premium-kpi-lift hover:border-[var(--brand-gold)]/45",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
      featured
      ? "min-h-[10.5rem] bg-[linear-gradient(165deg,rgb(201_168_76_/0.12),transparent_55%)] lg:col-span-2 2xl:col-span-2"
      : "min-h-[9rem]",
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={shell}
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
      className={shell}
      data-kpi-card=""
      data-kpi-featured={featured ? "1" : "0"}
      data-kpi-v2=""
      aria-label={`${item.title}: ${item.value}`}
    >
      {body}
    </article>
  );
}

/**
 * Faixa KPI — Sprint 26.2: delega ao cockpit unificado.
 * Mantém API `dominant` para testes 26.1.
 */
export function PremiumKpiStrip({
  items,
  dominant = true,
}: {
  items: PremiumKpiItem[];
  dominant?: boolean;
}) {
  void dominant;
  return <GFKpiCockpit items={items} featuredIndex={0} />;
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
            "gf-surface gf-surface-raised rounded-2xl border border-[var(--border-subtle)]",
            "bg-[var(--surface-2)] p-4 transition-colors",
            "hover:border-[var(--brand-gold)]/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
          )}
        >
          <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--text-muted)] uppercase">
            {item.title}
          </p>
          <p
            className={cn(
              "mt-2 whitespace-nowrap text-2xl font-semibold tabular-nums tracking-tight",
              item.unavailable && "text-[var(--text-muted)]",
            )}
          >
            {item.value}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)] text-pretty">
            {item.hint}
          </p>
        </Link>
      ))}
    </section>
  );
}
