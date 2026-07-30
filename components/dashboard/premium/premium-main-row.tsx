"use client";

import Link from "next/link";
import { AlertTriangle, CalendarDays, Sparkles } from "lucide-react";

import type { PremiumInsightCard } from "@/lib/dashboard/premium-dashboard-map";
import type { DashboardChartPoint } from "@/types/dashboard-executive";
import type { ExecutiveFinancialCockpitData } from "@/lib/dashboard/executive-financial-cockpit-types";
import { formatCurrency, formatCurrencyCompact } from "@/lib/dashboard/format";
import { PremiumRevenueChart } from "@/components/dashboard/premium/premium-revenue-chart";
import { cn } from "@/lib/utils";

function severityClass(s: PremiumInsightCard["severity"]) {
  if (s === "danger") return "border-danger/30 bg-danger/5";
  if (s === "warning") return "border-warning/30 bg-warning/5";
  if (s === "success") return "border-success/30 bg-success/5";
  return "border-border/50 bg-muted/20";
}

function severityDot(s: PremiumInsightCard["severity"]) {
  if (s === "danger") return "bg-danger";
  if (s === "warning") return "bg-warning";
  if (s === "success") return "bg-success";
  return "bg-muted-foreground";
}

/** Mini sparkline de fluxo — sem min-width que causa overflow. */
function CashSpark({
  data,
}: {
  data: DashboardChartPoint[];
}) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        Sem série de entradas/saídas no período.
      </p>
    );
  }
  const max = Math.max(
    ...data.flatMap((p) => [p.value, p.secondary ?? 0]),
    1,
  );
  const show = data.length > 14 ? data.filter((_, i) => i % 2 === 0) : data;

  return (
    <div className="mt-3" data-cash-spark="">
      <div className="mb-2 flex gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-sm bg-emerald-500" /> Entradas
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-sm bg-rose-500" /> Saídas
        </span>
      </div>
      <div
        className="flex h-24 w-full items-end gap-px overflow-hidden"
        role="img"
        aria-label="Entradas e saídas do período"
      >
        {show.map((point) => (
          <div
            key={point.data}
            className="flex min-w-0 flex-1 items-end justify-center gap-px"
            title={`${point.label}: E ${formatCurrency(point.value)} · S ${formatCurrency(point.secondary ?? 0)}`}
          >
            <div
              className="w-full max-w-[6px] rounded-t bg-emerald-500/80"
              style={{
                height: `${(point.value / max) * 100}%`,
                minHeight: point.value > 0 ? 2 : 0,
              }}
            />
            <div
              className="w-full max-w-[6px] rounded-t bg-rose-500/80"
              style={{
                height: `${((point.secondary ?? 0) / max) * 100}%`,
                minHeight: (point.secondary ?? 0) > 0 ? 2 : 0,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Segunda linha — gráfico 7 · inteligência 3 · fluxo 2 (Sprint 25.6.1).
 */
export function PremiumMainRow({
  faturamentoDiario,
  receitasVsDespesas,
  insights,
  cockpit,
  tenantSlug,
  periodoLabel,
}: {
  faturamentoDiario: DashboardChartPoint[];
  receitasVsDespesas: DashboardChartPoint[];
  insights: PremiumInsightCard[];
  cockpit: ExecutiveFinancialCockpitData;
  tenantSlug: string;
  periodoLabel: string;
}) {
  const topInsights = insights.slice(0, 3);
  const moreCount = Math.max(0, insights.length - 3);

  return (
    <section
      data-premium-block="main-row"
      data-dashboard-layout="main-row"
      className="grid grid-cols-1 gap-[var(--dashboard-gap)] lg:grid-cols-5 2xl:grid-cols-12"
    >
      {/* Gráfico — full no lg/xl notebook; 7 cols no 2xl */}
      <div
        className={cn(
          "min-w-0 overflow-hidden rounded-2xl border border-[var(--brand-gold)]/15 bg-[var(--surface-2)] p-4 shadow-[var(--elevation-card)]",
          "dark:bg-[var(--brand-graphite-elevated)]/80",
          "lg:col-span-5 2xl:col-span-7",
        )}
      >
        <div className="mb-3">
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
            Faturamento
          </h2>
          <p className="text-xs text-muted-foreground">
            Série diária · {periodoLabel}
          </p>
        </div>
        <PremiumRevenueChart
          data={faturamentoDiario}
          periodoLabel={periodoLabel}
        />
      </div>

      {/* Inteligência — 3/5 no lg (~60%), 3/12 no xl */}
      <div
        className={cn(
          "min-w-0 overflow-hidden rounded-2xl border border-border/50 bg-[var(--surface-2)] p-4 shadow-[var(--elevation-card)]",
          "dark:bg-[var(--brand-graphite-elevated)]/80",
          "lg:col-span-3 2xl:col-span-3",
        )}
        data-intel-panel=""
      >
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-[var(--brand-gold)]" aria-hidden />
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
            Central de Inteligência
          </h2>
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Análise baseada em regras, métricas e histórico do tenant.
        </p>
        <ul className="space-y-2">
          {topInsights.map((card) => (
            <li key={card.id}>
              <Link
                href={card.href ?? `/${tenantSlug}/dashboard`}
                className={cn(
                  "block rounded-xl border p-3 transition-colors hover:border-[var(--brand-gold)]/35",
                  severityClass(card.severity),
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      severityDot(card.severity),
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {card.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {card.body}
                    </p>
                    <p className="mt-2 text-[10px] tracking-wide text-muted-foreground/80 uppercase">
                      {card.confianca} · {card.origem}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {moreCount > 0 ? (
          <Link
            href={`#premium-trigger-alertas`}
            className="mt-3 inline-flex text-xs font-medium text-[var(--brand-gold)] hover:underline"
          >
            Ver todos ({insights.length})
          </Link>
        ) : null}
      </div>

      {/* Fluxo — 2/5 no lg (~40%), 2/12 no xl — SEM overflow-x */}
      <div
        className={cn(
          "min-w-0 overflow-x-hidden rounded-2xl border border-border/50 bg-[var(--surface-2)] p-4 shadow-[var(--elevation-card)]",
          "dark:bg-[var(--brand-graphite-elevated)]/80",
          "lg:col-span-2 2xl:col-span-2",
        )}
        data-cash-panel=""
      >
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Fluxo de caixa
        </h2>
        <p className="mt-1 text-xs text-muted-foreground text-pretty">
          {cockpit.saudeLabel}
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="min-w-0 space-y-0.5">
            <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
              Saldo
            </dt>
            <dd
              className="whitespace-nowrap font-semibold tabular-nums text-[clamp(0.9rem,0.8rem+0.35vw,1.05rem)]"
              title={
                cockpit.saldoAtual != null
                  ? formatCurrency(cockpit.saldoAtual)
                  : undefined
              }
            >
              {cockpit.saldoAtual != null
                ? formatCurrencyCompact(cockpit.saldoAtual)
                : "Indisponível"}
            </dd>
          </div>
          <div className="min-w-0 space-y-0.5">
            <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
              Proj. 7d
            </dt>
            <dd
              className="whitespace-nowrap font-semibold tabular-nums text-[clamp(0.9rem,0.8rem+0.35vw,1.05rem)]"
              title={
                cockpit.dias7.saldoProjetado != null
                  ? formatCurrency(cockpit.dias7.saldoProjetado)
                  : undefined
              }
            >
              {cockpit.dias7.saldoProjetado != null
                ? formatCurrencyCompact(cockpit.dias7.saldoProjetado)
                : "Indisponível"}
            </dd>
          </div>
          <div className="min-w-0 space-y-0.5">
            <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
              Entradas
            </dt>
            <dd className="whitespace-nowrap tabular-nums text-muted-foreground text-[clamp(0.85rem,0.75rem+0.3vw,1rem)]">
              {cockpit.dias7.entradasPrevistas != null
                ? formatCurrencyCompact(cockpit.dias7.entradasPrevistas)
                : "—"}
            </dd>
          </div>
          <div className="min-w-0 space-y-0.5">
            <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
              Saídas
            </dt>
            <dd className="whitespace-nowrap tabular-nums text-muted-foreground text-[clamp(0.85rem,0.75rem+0.3vw,1rem)]">
              {cockpit.dias7.saidasPrevistas != null
                ? formatCurrencyCompact(cockpit.dias7.saidasPrevistas)
                : "—"}
            </dd>
          </div>
        </dl>
        <CashSpark data={receitasVsDespesas} />
        <Link
          href={`/${tenantSlug}/financeiro/fluxo-caixa`}
          className="mt-3 inline-flex text-xs font-medium text-[var(--brand-gold)] hover:underline"
        >
          Abrir fluxo completo
        </Link>
      </div>
    </section>
  );
}

export function PremiumAlertsRail({
  insights,
  tenantSlug,
}: {
  insights: PremiumInsightCard[];
  tenantSlug: string;
}) {
  const alerts = insights.filter(
    (i) => i.severity === "danger" || i.severity === "warning",
  );

  return (
    <aside
      data-premium-block="alerts-rail"
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
    >
      <div className="min-w-0 overflow-hidden rounded-2xl border border-border/50 bg-[var(--surface-2)] p-4 dark:bg-[var(--brand-graphite-elevated)]/70">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="size-4 text-[var(--brand-gold)]" />
          <h2 className="text-sm font-semibold">Calendário fiscal</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Indisponível — nenhuma fonte confiável de obrigações fiscais carregada
          neste ciclo. Não inventamos vencimentos.
        </p>
        <Link
          href={`/${tenantSlug}/financeiro`}
          className="mt-3 inline-flex text-xs text-[var(--brand-gold)] hover:underline"
        >
          Ir ao Financeiro
        </Link>
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-border/50 bg-[var(--surface-2)] p-4 dark:bg-[var(--brand-graphite-elevated)]/70">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="size-4 text-warning" />
          <h2 className="text-sm font-semibold">Alertas inteligentes</h2>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum alerta crítico ou de atenção no momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.slice(0, 5).map((a) => (
              <li key={a.id} className="text-sm">
                <Link
                  href={a.href ?? `/${tenantSlug}/dashboard`}
                  className="font-medium hover:text-[var(--brand-gold)]"
                >
                  {a.title}
                </Link>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {a.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
