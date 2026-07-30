"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import type { TreasuryPeriodKey } from "@/lib/finance";
import { cn } from "@/lib/utils";

const OPTIONS: { key: TreasuryPeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "60d", label: "60 dias" },
  { key: "90d", label: "90 dias" },
  { key: "this_month", label: "Este mês" },
  { key: "last_month", label: "Mês anterior" },
  { key: "this_year", label: "Este ano" },
  { key: "custom", label: "Personalizado" },
];

type Props = {
  value?: TreasuryPeriodKey;
  paramName?: string;
  className?: string;
  showCustomDates?: boolean;
};

export function FinancePeriodFilter({
  value = "30d",
  paramName = "period",
  className,
  showCustomDates = true,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = (searchParams.get(paramName) as TreasuryPeriodKey) || value;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function setPeriod(
    key: TreasuryPeriodKey,
    extra?: { from?: string; to?: string },
  ) {
    const next = new URLSearchParams(searchParams.toString());
    next.set(paramName, key);
    if (key === "custom") {
      if (extra?.from) next.set("from", extra.from);
      if (extra?.to) next.set("to", extra.to);
    } else {
      next.delete("from");
      next.delete("to");
    }
    startTransition(() => {
      router.replace(`?${next.toString()}`);
    });
  }

  return (
    <div
      data-finance-period-filter
      className={cn("space-y-3", className)}
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Período
        </p>
        {pending ? (
          <span className="text-xs text-muted-foreground">A atualizar…</span>
        ) : null}
      </div>

      <div
        role="group"
        aria-label="Filtro de período"
        className="inline-flex max-w-full flex-wrap gap-0.5 rounded-xl border border-border/50 bg-muted/40 p-1 shadow-sm"
      >
        {OPTIONS.map((opt) => {
          const selected = current === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setPeriod(opt.key)}
              className={cn(
                "h-8 rounded-lg px-2.5 text-xs font-medium transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40 focus-visible:ring-offset-1",
                selected
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/40"
                  : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {showCustomDates && current === "custom" ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border/60 bg-card/50 px-3 py-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">De</span>
            <input
              type="date"
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/35"
              value={from}
              onChange={(e) =>
                setPeriod("custom", { from: e.target.value, to })
              }
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Até</span>
            <input
              type="date"
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/35"
              value={to}
              onChange={(e) =>
                setPeriod("custom", { from, to: e.target.value })
              }
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
