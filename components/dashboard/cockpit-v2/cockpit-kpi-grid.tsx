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

/**
 * Cor de identidade por KPI — variedade visual real (não é status de bom/
 * ruim, é só pra cada métrica ter sua própria cor, como num dashboard
 * financeiro premium). Status de bom/ruim continua vindo do trend
 * (verde/vermelho), aplicado à parte.
 */
const KPI_ACCENT: Record<string, string> = {
  faturamento: "bg-blue-500/15 text-blue-400",
  lucro: "bg-emerald-500/15 text-emerald-400",
  margem: "bg-violet-500/15 text-violet-400",
  ebitda: "bg-sky-500/15 text-sky-400",
  caixa: "bg-teal-500/15 text-teal-400",
  clientes: "bg-indigo-500/15 text-indigo-400",
  meta: "bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]",
  ordens: "bg-amber-500/15 text-amber-400",
  pendencias: "bg-rose-500/15 text-rose-400",
};

const DEFAULT_ACCENT = "bg-[var(--brand-gold)]/12 text-[var(--brand-gold)]";

function TrendIcon({ direction }: { direction?: "up" | "down" | "flat" }) {
  if (direction === "up")
    return <TrendingUp className="size-3 shrink-0" aria-hidden />;
  if (direction === "down")
    return <TrendingDown className="size-3 shrink-0" aria-hidden />;
  return <Minus className="size-3 shrink-0" aria-hidden />;
}

type Props = {
  items: CockpitKpiItem[];
  periodoLabel: string;
  tenantSlug: string;
};

/**
 * Grid compacto de KPIs — Sprint 30.4.3 (alinhado à referência visual do
 * Renato: chips curtos com ícone à esquerda, valor + variação, várias
 * métricas numa única faixa em vez de cards grandes empilhados).
 */
export function CockpitKpiGrid({ items, periodoLabel, tenantSlug }: Props) {
  const [active, setActive] = useState<CockpitKpiItem | null>(null);

  return (
    <section
      aria-label="KPIs principais"
      data-cockpit-block="kpis"
      data-sprint="30.4.3"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
            KPIs principais
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Valor · variação · drill-down
          </p>
        </div>
      </div>

      <ul
        className={cn(
          "grid gap-2.5",
          "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        )}
      >
        {items.map((item) => {
          const Icon = ICONS[item.id] ?? CircleDollarSign;
          const accent = KPI_ACCENT[item.id] ?? DEFAULT_ACCENT;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActive(item)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-2xl border p-3 text-left",
                  "border-[var(--border-premium)] bg-[var(--surface-raised)] shadow-[var(--shadow-card)]",
                  "dark:bg-[var(--brand-graphite-elevated)]/85",
                  "transition-[border-color,transform] motion-safe:duration-200",
                  "hover:border-[var(--brand-gold)]/45 hover:-translate-y-0.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
                )}
                aria-label={`${item.title}: ${item.value}. ${item.comparisonLabel}. Abrir detalhe.`}
                data-kpi-id={item.id}
              >
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
                    accent,
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-medium tracking-[0.08em] text-[var(--text-muted)] uppercase">
                    {item.title}
                  </p>
                  <p
                    className={cn(
                      "font-semibold tracking-tight tabular-nums",
                      item.unavailable
                        ? "text-sm leading-snug"
                        : "truncate text-base",
                      item.unavailable && "text-[var(--text-muted)]",
                    )}
                  >
                    {item.value}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 inline-flex items-center gap-1 truncate text-[11px]",
                      item.trend?.direction === "up" && "text-success",
                      item.trend?.direction === "down" && "text-danger",
                      (!item.trend?.direction || item.trend.direction === "flat") &&
                        "text-[var(--text-muted)]",
                    )}
                  >
                    <TrendIcon direction={item.trend?.direction} />
                    <span className="truncate">{item.comparisonLabel}</span>
                  </p>
                </div>
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
