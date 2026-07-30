"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DashboardChartPoint } from "@/types/dashboard-executive";
import {
  formatCurrency,
  formatCurrencyChartLabel,
  formatCurrencyCompact,
} from "@/lib/dashboard/format";
import {
  REVENUE_CHART_VIEW,
  buildRevenueCoords,
  buildRevenueTooltip,
  formatChartDate,
  resolveRevenueBreakpoint,
  selectRevenueLabels,
  type RevenueChartBreakpoint,
} from "@/lib/dashboard/revenue-chart-labels";
import { cn } from "@/lib/utils";

type Props = {
  data: DashboardChartPoint[];
  periodoLabel: string;
  /** Metas diárias por data ISO — opcional; nunca inventar. */
  metaByDate?: Record<string, number> | null;
};

/**
 * Gráfico de faturamento com labels executivos (Sprint 25.6.3).
 */
export function PremiumRevenueChart({
  data,
  periodoLabel,
  metaByDate = null,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [breakpoint, setBreakpoint] =
    useState<RevenueChartBreakpoint>("notebook");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const update = () => {
      setBreakpoint(resolveRevenueBreakpoint(el.clientWidth));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasValues = data.some((p) => p.value !== 0);
  const coords = useMemo(() => buildRevenueCoords(data), [data]);

  const effectiveActive = pinnedIndex ?? activeIndex;
  const labels = useMemo(
    () => selectRevenueLabels(coords, breakpoint, effectiveActive),
    [coords, breakpoint, effectiveActive],
  );

  const tooltip = useMemo(
    () =>
      effectiveActive != null
        ? buildRevenueTooltip(coords, effectiveActive, metaByDate)
        : null,
    [coords, effectiveActive, metaByDate],
  );

  if (data.length === 0 || !hasValues) {
    return (
      <div
        className="flex min-h-[var(--panel-min-height)] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 text-center text-sm text-muted-foreground"
        data-chart-empty=""
      >
        Sem faturamento no período selecionado.
      </div>
    );
  }

  const { w, h } = REVENUE_CHART_VIEW;
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `0,${h} ${polyline} ${w},${h}`;
  const last = coords[coords.length - 1]!;
  const lastMeaningful =
    [...coords].reverse().find((c) => c.point.value !== 0) ?? last;
  const focusableIndexes = new Set(labels.map((l) => l.index));

  return (
    <div
      ref={shellRef}
      className="space-y-3 overflow-x-hidden"
      data-chart-revenue=""
      data-chart-breakpoint={breakpoint}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Último ponto · {periodoLabel}
        </p>
        <p className="whitespace-nowrap text-lg font-semibold tabular-nums">
          {formatCurrencyCompact(lastMeaningful.point.value)}
        </p>
      </div>

      <div className="relative min-h-[min(18rem,42vh)] w-full">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-[min(18rem,42vh)] w-full"
          role="img"
          aria-label="Faturamento diário com valores principais"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--brand-gold)"
                stopOpacity="0.28"
              />
              <stop
                offset="100%"
                stopColor="var(--brand-gold)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <polygon fill="url(#revFill)" points={area} />
          <polyline
            fill="none"
            stroke="var(--brand-gold)"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
            points={polyline}
            pathLength={1}
            className="premium-chart-line"
            data-chart-line=""
          />
        </svg>

        {/* Pontos interativos — HTML para foco/teclado sem distorção do SVG */}
        <div className="pointer-events-none absolute inset-0">
          {coords.map((c) => {
            const isFocusable = focusableIndexes.has(c.index);
            const isActive = effectiveActive === c.index;
            const isPeak = labels.some(
              (l) => l.index === c.index && l.role === "peak",
            );
            return (
              <button
                key={c.point.data}
                type="button"
                tabIndex={isFocusable || breakpoint === "desktop" ? 0 : -1}
                className={cn(
                  "pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  "border border-[var(--brand-gold)]/80 bg-[var(--brand-gold)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/70",
                  isPeak && "size-3.5 ring-2 ring-[var(--brand-gold)]/35",
                  isActive && "ring-2 ring-white/40",
                )}
                style={{
                  left: `${c.x}%`,
                  top: `${(c.y / h) * 100}%`,
                }}
                aria-label={`${formatChartDate(c.point.data)}, faturamento ${formatCurrency(c.point.value)}, ponto ${c.index + 1} de ${coords.length}`}
                onMouseEnter={() => setActiveIndex(c.index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(c.index)}
                onBlur={() => setActiveIndex(null)}
                onClick={() =>
                  setPinnedIndex((prev) => (prev === c.index ? null : c.index))
                }
              />
            );
          })}
        </div>

        {/* Labels fixos */}
        <div className="pointer-events-none absolute inset-0 overflow-visible">
          {labels.map((label) => {
            const value = coords[label.index]!.point.value;
            const left = Math.min(
              92,
              Math.max(8, label.x + label.dx),
            );
            const topPct = (label.y / h) * 100;
            return (
              <div
                key={`${label.role}-${label.index}`}
                data-chart-label={label.role}
                className={cn(
                  "absolute z-[2] max-w-[7.5rem] -translate-x-1/2 whitespace-nowrap rounded-md border px-1.5 py-0.5",
                  "bg-[var(--brand-navy)]/90 text-[10px] font-semibold tabular-nums text-white shadow-md",
                  "border-[var(--brand-gold)]/35 backdrop-blur-sm premium-chart-label-enter",
                  label.highlight && "border-[var(--brand-gold)]/55 text-[var(--brand-gold-soft)]",
                  label.side === "above" ? "-translate-y-[calc(100%+6px)]" : "translate-y-[6px]",
                )}
                style={{
                  left: `${left}%`,
                  top: `${topPct}%`,
                }}
              >
                {formatCurrencyChartLabel(value)}
              </div>
            );
          })}
        </div>

        {/* Tooltip premium */}
        {tooltip ? (
          <div
            data-chart-tooltip=""
            role="tooltip"
            className={cn(
              "pointer-events-none absolute z-[3] w-[11.5rem] -translate-x-1/2 rounded-xl border border-[var(--border-premium)]",
              "bg-[var(--brand-navy)]/95 p-2.5 text-left shadow-[var(--shadow-elevated)] backdrop-blur-md",
              "premium-enter",
            )}
            style={{
              left: `${Math.min(88, Math.max(12, coords[tooltip.index]!.x))}%`,
              top: `${Math.max(4, (coords[tooltip.index]!.y / h) * 100 - 18)}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="text-[10px] tracking-wide text-white/55 uppercase">
              {formatChartDate(tooltip.point.data)}
            </p>
            <p className="mt-1 text-xs text-white/70">Faturamento</p>
            <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-white">
              {formatCurrency(tooltip.point.value)}
            </p>
            {tooltip.delta != null ? (
              <p
                className={cn(
                  "mt-1.5 text-[11px] tabular-nums",
                  tooltip.delta > 0 && "text-success",
                  tooltip.delta < 0 && "text-danger",
                  tooltip.delta === 0 && "text-white/55",
                )}
              >
                vs dia anterior:{" "}
                {tooltip.delta > 0 ? "+" : ""}
                {formatCurrency(tooltip.delta)}
                {tooltip.variationPct != null
                  ? ` (${tooltip.variationPct > 0 ? "+" : ""}${tooltip.variationPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)`
                  : ""}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-white/45">
                Sem dia anterior no período
              </p>
            )}
            {tooltip.metaStatus != null && tooltip.metaValue != null ? (
              <p className="mt-1 text-[11px] text-[var(--brand-gold)]/90">
                Meta do dia: {formatCurrency(tooltip.metaValue)} ·{" "}
                {tooltip.metaStatus === "acima"
                  ? "acima"
                  : tooltip.metaStatus === "abaixo"
                    ? "abaixo"
                    : "no alvo"}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground sm:text-xs">
        <span>{data[0]?.label}</span>
        <span>{last.point.label}</span>
      </div>
    </div>
  );
}
