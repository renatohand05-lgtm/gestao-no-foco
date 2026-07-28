"use client";

import type { FinancialSummary } from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 px-3 py-2">
      <p className={gofTypography.caption}>{label}</p>
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

type Props = {
  summary: FinancialSummary;
  className?: string;
};

export function FinancialSummaryCards({ summary, className }: Props) {
  return (
    <section
      data-financial-summary
      className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-4", className)}
    >
      <Card label="Saldo Atual" value={money(summary.currentBalance)} />
      <Card label="Entradas Hoje" value={money(summary.inflowsToday)} />
      <Card label="Saídas Hoje" value={money(summary.outflowsToday)} />
      <Card label="Saldo Previsto" value={money(summary.projectedBalance)} />
      <Card label="Saldo Disponível" value={money(summary.availableBalance)} />
      <Card label="Fluxo Diário" value={money(summary.dailyNet)} />
      <Card label="Fluxo Mensal" value={money(summary.monthlyNet)} />
    </section>
  );
}
