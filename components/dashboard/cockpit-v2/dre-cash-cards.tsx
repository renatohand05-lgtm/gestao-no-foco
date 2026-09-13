import Link from "next/link";
import { LineChart, Wallet } from "lucide-react";

import type {
  CashExecutiveCardModel,
  DreExecutiveCardModel,
} from "@/lib/dashboard/cockpit-v2/panels";
import { cn } from "@/lib/utils";

type Props = {
  dre: DreExecutiveCardModel;
  cash: CashExecutiveCardModel;
};

export function DreCashCards({ dre, cash }: Props) {
  const maxSpark = Math.max(1, ...dre.spark.map((p) => Math.abs(p.value)));

  return (
    <div
      className="grid gap-3 lg:grid-cols-2"
      data-cockpit-block="dre-cash"
      data-sprint="30.4.1"
    >
      <section
        aria-label="DRE executivo"
        className="rounded-2xl border border-[var(--border-premium)] bg-[var(--surface-raised)] p-4 sm:p-5 dark:bg-[var(--brand-graphite-elevated)]/90"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <LineChart className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-medium tracking-[0.14em] text-sky-500 dark:text-sky-400 uppercase">
                DRE executivo
              </p>
              <h2 className="mt-0.5 text-lg font-semibold">Leitura do resultado</h2>
            </div>
          </div>
          <Link
            href={dre.href}
            className="shrink-0 text-xs font-medium text-[var(--brand-gold)] hover:underline"
          >
            Drill-down DRE
          </Link>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Row label="Receita" value={dre.receita} />
          <Row label="Custos" value={dre.custos} />
          <Row label="Despesas" value={dre.despesas} />
          <Row label="Lucro" value={dre.lucro} />
          <Row label="EBITDA" value={dre.ebitda} />
          <Row label="Margem" value={dre.margem} />
        </dl>
        <p className="mt-3 text-xs text-[var(--text-secondary)]">{dre.comparativo}</p>
        {dre.notice ? (
          <p className="mt-1 text-xs text-[var(--text-muted)]">{dre.notice}</p>
        ) : null}
        {dre.spark.length > 0 ? (
          <div
            className="mt-4 flex h-12 items-end gap-1"
            aria-label="Mini gráfico EBITDA"
          >
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
        ) : (
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Mini gráfico indisponível — série EBITDA não carregada.
          </p>
        )}
      </section>

      <section
        aria-label="Fluxo de caixa executivo"
        className={cn(
          "rounded-2xl border p-4 sm:p-5",
          "border-[var(--border-premium)] bg-[var(--surface-raised)]",
          "dark:bg-[var(--brand-graphite-elevated)]/90",
          cash.tone === "danger" && "border-danger/40",
          cash.tone === "warning" && "border-warning/40",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400">
              <Wallet className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-medium tracking-[0.14em] text-teal-500 dark:text-teal-400 uppercase">
                Fluxo de caixa
              </p>
              <h2 className="mt-0.5 text-lg font-semibold">Cartão executivo · 7 dias</h2>
            </div>
          </div>
          <Link
            href={cash.href}
            className="shrink-0 text-xs font-medium text-[var(--brand-gold)] hover:underline"
          >
            Abrir fluxo
          </Link>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Row label="Saldo atual" value={cash.saldoAtual} />
          <Row label="Saldo projetado" value={cash.saldoProjetado} />
          <Row label="Entradas previstas" value={cash.entradas} />
          <Row label="Saídas previstas" value={cash.saidas} />
        </dl>
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">Maior vencimento · </span>
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
          <span className="font-medium">Maior risco · </span>
          {cash.maiorRisco}
        </p>
        {cash.notice ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">{cash.notice}</p>
        ) : null}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 px-2.5 py-2">
      <dt className="text-[10px] text-[var(--text-muted)] uppercase">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
