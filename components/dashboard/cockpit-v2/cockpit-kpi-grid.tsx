"use client";

import { useState } from "react";
import {
  Banknote,
  CircleDollarSign,
  ClipboardList,
  Gauge,
  LineChart,
  Target,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
  AlertCircle,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { KpiDrilldownDialog } from "@/components/dashboard/cockpit-v2/kpi-drilldown-dialog";
import type { CockpitKpiItem } from "@/lib/dashboard/cockpit-v2/kpis";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  faturamento: CircleDollarSign,
  lucro: Banknote,
  margem: Gauge,
  ebitda: LineChart,
  caixa: Wallet,
  meta: Target,
  clientes: Users,
  ordens: ClipboardList,
  pendencias: AlertCircle,
};

function TrendIcon({ direction }: { direction?: "up" | "down" | "flat" }) {
  if (direction === "up")
    return <TrendingUp className="size-3.5 shrink-0" aria-hidden />;
  if (direction === "down")
    return <TrendingDown className="size-3.5 shrink-0" aria-hidden />;
  return <Minus className="size-3.5 shrink-0" aria-hidden />;
}

type Props = {
  items: CockpitKpiItem[];
  periodoLabel: string;
};

export function CockpitKpiGrid({ items, periodoLabel }: Props) {
  const [active, setActive] = useState<CockpitKpiItem | null>(null);

  return (
    <section
      aria-label="KPIs principais"
      data-cockpit-block="kpis"
      data-sprint="30.4"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
            KPIs principais
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Valor · variação · contexto · drill-down
          </p>
        </div>
      </div>

      <ul
        className={cn(
          "grid gap-3",
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3",
        )}
      >
        {items.map((item, index) => {
          const Icon = ICONS[item.id] ?? CircleDollarSign;
          const featured = index === 0;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActive(item)}
                className={cn(
                  "flex h-full min-h-[9.5rem] w-full flex-col rounded-2xl border p-4 text-left",
                  "border-[var(--border-premium)] bg-[var(--surface-raised)] shadow-[var(--shadow-card)]",
                  "dark:bg-[var(--brand-graphite-elevated)]/85",
                  "transition-[border-color,transform] motion-safe:duration-200",
                  "hover:border-[var(--brand-gold)]/45 hover:-translate-y-0.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
                  featured &&
                    "bg-[linear-gradient(165deg,rgb(201_168_76_/0.12),transparent_55%)] sm:col-span-2 lg:col-span-1",
                )}
                aria-label={`${item.title}: ${item.value}. ${item.comparisonLabel}. Abrir detalhe.`}
                data-kpi-id={item.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-medium tracking-[0.1em] text-[var(--text-muted)] uppercase">
                    {item.title}
                  </p>
                  <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--brand-gold)]/12 text-[var(--brand-gold)]">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-3 font-semibold tracking-tight tabular-nums",
                    featured
                      ? "text-[clamp(1.45rem,1.1rem+1vw,2.1rem)]"
                      : "text-[clamp(1.2rem,0.95rem+0.6vw,1.65rem)]",
                    item.unavailable && "text-[var(--text-muted)]",
                  )}
                >
                  {item.value}
                </p>
                <p className="mt-2 text-xs text-[var(--text-secondary)] text-pretty">
                  {item.supportingText}
                </p>
                <p
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 text-xs",
                    item.trend?.direction === "up" && "text-success",
                    item.trend?.direction === "down" && "text-danger",
                    (!item.trend?.direction || item.trend.direction === "flat") &&
                      "text-[var(--text-muted)]",
                  )}
                >
                  <TrendIcon direction={item.trend?.direction} />
                  <span>{item.comparisonLabel}</span>
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <KpiDrilldownDialog
        item={active}
        periodoLabel={periodoLabel}
        onClose={() => setActive(null)}
      />
    </section>
  );
}
