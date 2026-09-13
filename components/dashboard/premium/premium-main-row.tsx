"use client";

import Link from "next/link";
import { AlertTriangle, CalendarDays, LineChart, Sparkles, Wallet } from "lucide-react";

import type { PremiumInsightCard } from "@/lib/dashboard/premium-dashboard-map";
import type {
  CashExecutiveCardModel,
  DreExecutiveCardModel,
} from "@/lib/dashboard/cockpit-v2/panels";
import type { DashboardChartPoint } from "@/types/dashboard-executive";
import { formatCurrency } from "@/lib/dashboard/format";
import { GFInsightCard } from "@/components/gf/gf-insight-card";
import { GFRevenueChart } from "@/components/gf/gf-revenue-chart";
import { cn } from "@/lib/utils";

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
 * Segunda linha — gráfico autoral · inteligência sem scroll interno · fluxo (Sprint 26.1).
 */
export function PremiumMainRow({
  faturamentoDiario,
  receitasVsDespesas,
  dre,
  cash,
  periodoLabel,
}: {
  faturamentoDiario: DashboardChartPoint[];
  receitasVsDespesas: DashboardChartPoint[];
  dre: DreExecutiveCardModel;
  cash: CashExecutiveCardModel;
  periodoLabel: string;
}) {
  const maxSpark = Math.max(1, ...dre.spark.map((p) => Math.abs(p.value)));

  return (
    <section
      data-premium-block="main-row"
      data-dashboard-layout="main-row"
      data-authorial-charts=""
      className="grid grid-cols-1 gap-[var(--dashboard-gap)] lg:grid-cols-5 2xl:grid-cols-12"
    >
      {/* Gráfico autoral — full no lg; 7 cols no 2xl */}
      <div
        className={cn(
          "gf-surface min-w-0 overflow-hidden rounded-2xl p-4",
          "border border-border bg-card shadow-[var(--elevation-card)]",
          "dark:bg-[var(--brand-graphite-elevated)]",
          "lg:col-span-5 2xl:col-span-5",
        )}
        data-chart-panel="revenue"
      >
        <div className="mb-3">
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-[var(--text-primary)]">
            Faturamento
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Série diária · {periodoLabel}
          </p>
        </div>
        <GFRevenueChart
          data={faturamentoDiario}
          periodoLabel={periodoLabel}
          origem="Dashboard · vendas"
          confianca="Alta"
        />
      </div>

      {/* DRE executivo */}
      <div
        className={cn(
          "min-w-0 overflow-hidden rounded-2xl border border-[var(--border)]",
          "bg-[var(--card)] p-4 shadow-[var(--elevation-card)]",
          "lg:col-span-3 2xl:col-span-4",
        )}
        data-dre-panel=""
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <LineChart className="size-3.5" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-medium tracking-[0.14em] text-sky-500 dark:text-sky-400 uppercase">
                DRE executivo
              </p>
              <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-primary)]">
                Leitura do resultado
              </h2>
            </div>
          </div>
          <Link
            href={dre.href}
            className="shrink-0 text-xs font-medium text-[var(--brand-gold)] hover:underline"
          >
            Drill-down
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <DreRow label="Receita" value={dre.receita} />
          <DreRow label="Custos" value={dre.custos} />
          <DreRow label="Despesas" value={dre.despesas} />
          <DreRow label="Lucro" value={dre.lucro} />
          <DreRow label="EBITDA" value={dre.ebitda} />
          <DreRow label="Margem" value={dre.margem} />
        </dl>
        <p className="mt-3 text-xs text-[var(--text-secondary)]">{dre.comparativo}</p>
        {dre.spark.length > 0 ? (
          <div className="mt-3 flex h-10 items-end gap-1" aria-label="Mini gráfico EBITDA">
            {dre.spark.map((p) => (
              <div
                key={`${p.label}-${p.value}`}
                className="flex-1 rounded-sm bg-gradient-to-t from-sky-600 to-sky-400"
                style={{
                  height: `${Math.max(8, (Math.abs(p.value) / maxSpark) * 100)}%`,
                }}
                title={`${p.label}: ${p.value}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Fluxo de caixa — SEM overflow-x */}
      <div
        className={cn(
          "min-w-0 overflow-x-hidden rounded-2xl border p-4 shadow-[var(--elevation-card)]",
          "border-border bg-card dark:bg-[var(--brand-graphite-elevated)]",
          cash.tone === "danger" && "border-danger/40",
          cash.tone === "warning" && "border-warning/40",
        )}
        data-cash-panel=""
      >
        <div className="mb-2 flex items-start gap-2">
          <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400">
            <Wallet className="size-3.5" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-medium tracking-[0.14em] text-teal-500 dark:text-teal-400 uppercase">
              Fluxo de caixa
            </p>
            <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-primary)]">
              7 dias
            </h2>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <DreRow label="Saldo atual" value={cash.saldoAtual} />
          <DreRow label="Saldo proj." value={cash.saldoProjetado} />
          <DreRow label="Entradas" value={cash.entradas} />
          <DreRow label="Saídas" value={cash.saidas} />
        </dl>
        <CashSpark data={receitasVsDespesas} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">Vencimento · </span>
          {cash.maiorVencimento}
        </p>
        <p
          className={cn(
            "mt-1 text-xs",
            cash.tone === "danger" && "text-danger",
            cash.tone === "warning" && "text-warning",
            cash.tone === "success" && "text-success",
            cash.tone === "neutral" && "text-[var(--text-muted)]",
          )}
        >
          <span className="font-medium">Risco · </span>
          {cash.maiorRisco}
        </p>
        <Link
          href={cash.href}
          className="mt-2 inline-flex text-xs font-medium text-[var(--brand-gold)] hover:underline"
        >
          Abrir fluxo completo →
        </Link>
      </div>
    </section>
  );
}

function DreRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 px-2.5 py-2">
      <dt className="text-[10px] text-[var(--text-muted)] uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * Central de Inteligência — extraída do main-row (Sprint 30.4.2) pra
 * abrir espaço pro DRE/Caixa ficarem lado a lado com o Faturamento.
 * Mesmos dados, só reposicionada.
 */
export function IntelligenceCenterPanel({
  insights,
  tenantSlug,
}: {
  insights: PremiumInsightCard[];
  tenantSlug: string;
}) {
  const topInsights = insights.slice(0, 3);
  const moreCount = Math.max(0, insights.length - 3);

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-[var(--border)]",
        "bg-[var(--card)] p-4 shadow-[var(--elevation-card)]",
      )}
      data-intel-panel=""
      data-intel-no-scroll=""
      data-intel-levels="3"
    >
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="size-4 shrink-0 text-[var(--brand-gold)]" aria-hidden />
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--text-primary)]">
          Central de Inteligência
        </h2>
      </div>
      <p className="mb-2 text-[11px] text-[var(--text-secondary)]">
        Top 3 · Análise baseada em regras, métricas e histórico do tenant.
      </p>
      <ul className="grid gap-2 sm:grid-cols-3">
        {topInsights.map((card) => (
          <li key={card.id}>
            <GFInsightCard
              title={card.title}
              body={card.body}
              confianca={card.confianca}
              origem={card.origem}
              href={card.href ?? `/${tenantSlug}/dashboard`}
              severity={card.severity}
            />
          </li>
        ))}
      </ul>
      {moreCount > 0 ? (
        <Link
          href={`#premium-trigger-alertas`}
          className="mt-2 inline-flex text-xs font-medium text-[var(--brand-gold)] hover:underline"
        >
          Ver todos ({insights.length})
        </Link>
      ) : null}
    </div>
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
