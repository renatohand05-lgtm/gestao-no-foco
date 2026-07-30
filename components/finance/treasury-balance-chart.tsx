"use client";

import type { TreasuryBalanceEvolution, TreasuryPeriodKey } from "@/lib/finance";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const CHART_PERIODS: { key: TreasuryPeriodKey; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "60d", label: "60d" },
  { key: "90d", label: "90d" },
  { key: "12m", label: "12m" },
];

type Props = {
  evolution: TreasuryBalanceEvolution | null;
  periodKey?: TreasuryPeriodKey;
  onPeriodChange?: (key: TreasuryPeriodKey) => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
};

export function TreasuryBalanceChart({
  evolution,
  periodKey,
  onPeriodChange,
  loading = false,
  error = null,
  className,
}: Props) {
  const points = evolution?.points ?? [];
  const isEmpty =
    !loading &&
    !error &&
    (evolution == null ||
      evolution.hasMovements === false ||
      points.length === 0);

  const maxBal = Math.max(evolution?.maxBalance ?? 1, 1);
  const minBal = Math.min(evolution?.minBalance ?? 0, 0);
  const span = Math.max(maxBal - minBal, 1);

  return (
    <Card
      data-treasury-balance-chart
      data-chart-empty={isEmpty ? "true" : "false"}
      className={cn("border-border/40 shadow-sm ring-1 ring-border/10", className)}
    >
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="text-base">Evolução do caixa</CardTitle>
          <CardDescription>
            {loading
              ? "A carregar série de saldos…"
              : error
                ? "Não foi possível carregar o gráfico"
                : isEmpty
                  ? "Sem movimentações no período selecionado"
                  : `Tendência ${evolution?.trend}${
                      evolution?.trendPct != null
                        ? ` · ${evolution.trendPct}%`
                        : ""
                    }`}
          </CardDescription>
        </div>
        {onPeriodChange ? (
          <div
            className="inline-flex flex-wrap gap-0.5 rounded-lg border border-border/50 bg-muted/40 p-0.5"
            role="group"
            aria-label="Período do gráfico"
          >
            {CHART_PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={periodKey === p.key}
                className={cn(
                  "h-7 rounded-md px-2 text-xs font-medium outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
                  periodKey === p.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
                )}
                onClick={() => onPeriodChange(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="A carregar gráfico">
            <Skeleton className="h-40 w-full rounded-lg" />
            <div className="grid gap-2 sm:grid-cols-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </div>
        ) : error ? (
          <div
            className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-amber-600/30 bg-amber-50/40 px-4 py-8 text-center"
            role="alert"
          >
            <p className="text-sm text-amber-950">{error}</p>
          </div>
        ) : isEmpty ? (
          <div data-treasury-chart-empty>
            <EmptyState
              icon={LineChart}
              title="Sem evolução para exibir"
              description="Quando houver entradas ou saídas no período, o gráfico mostra o saldo acumulado dia a dia. O saldo consolidado continua nos KPIs."
              className="border-0 bg-transparent py-8 shadow-none"
            />
          </div>
        ) : (
          <>
            <div
              className="flex h-40 items-end gap-0.5 sm:h-48"
              role="img"
              aria-label="Gráfico de saldo acumulado"
            >
              {points.map((p) => {
                const h = ((p.balance - minBal) / span) * 100;
                return (
                  <div
                    key={p.date}
                    className="group relative min-w-0 flex-1 rounded-t bg-[var(--brand-graphite)]/75 transition-colors hover:bg-[var(--brand-graphite)]"
                    style={{ height: `${Math.max(6, h)}%` }}
                  >
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-[12rem] -translate-x-1/2 rounded-md bg-[var(--brand-graphite)] px-2 py-1 text-[11px] text-white shadow-md group-hover:block group-focus-within:block">
                      {formatDate(p.date)}
                      <br />
                      Saldo {money(p.balance)}
                      <br />
                      +{money(p.inflows)} / −{money(p.outflows)}
                    </span>
                  </div>
                );
              })}
            </div>
            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Menor saldo</dt>
                <dd className="font-medium tabular-nums">
                  {money(evolution!.minBalance)}
                  {evolution!.minDate
                    ? ` · ${formatDate(evolution!.minDate)}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Maior saldo</dt>
                <dd className="font-medium tabular-nums">
                  {money(evolution!.maxBalance)}
                  {evolution!.maxDate
                    ? ` · ${formatDate(evolution!.maxDate)}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Entradas (último ponto)</dt>
                <dd className="font-medium tabular-nums text-emerald-700">
                  {money(points[points.length - 1]?.inflows ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Saídas (último ponto)</dt>
                <dd className="font-medium tabular-nums text-red-700">
                  {money(points[points.length - 1]?.outflows ?? 0)}
                </dd>
              </div>
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
}
