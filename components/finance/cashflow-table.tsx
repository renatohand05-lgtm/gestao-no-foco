"use client";

import type { CashFlow } from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  cashFlow: CashFlow;
  className?: string;
};

export function CashflowTable({ cashFlow, className }: Props) {
  return (
    <section
      data-cashflow-table
      className={cn("overflow-x-auto rounded-xl border border-border/60", className)}
    >
      <div className="border-b border-border/40 px-4 py-3">
        <p className={gofTypography.title}>Resumo do fluxo</p>
        <p className={gofTypography.caption}>
          {cashFlow.from} → {cashFlow.to} · Entradas {money(cashFlow.totalInflows)} ·
          Saídas {money(cashFlow.totalOutflows)}
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 text-left text-muted-foreground">
            <th className="px-4 py-2">Data</th>
            <th className="px-4 py-2">Entradas</th>
            <th className="px-4 py-2">Saídas</th>
            <th className="px-4 py-2">Líquido</th>
            <th className="px-4 py-2">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {cashFlow.points.map((p) => (
            <tr key={p.date} className="border-b border-border/20">
              <td className="px-4 py-2">{p.date}</td>
              <td className="px-4 py-2 tabular-nums">{money(p.inflows)}</td>
              <td className="px-4 py-2 tabular-nums">{money(p.outflows)}</td>
              <td className="px-4 py-2 tabular-nums">{money(p.net)}</td>
              <td className="px-4 py-2 tabular-nums">{money(p.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
