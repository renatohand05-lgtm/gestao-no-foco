"use client";

import type { CashFlowPoint } from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  points: CashFlowPoint[];
  className?: string;
};

export function CashflowChart({ points, className }: Props) {
  const max = Math.max(1, ...points.map((p) => Math.max(p.inflows, p.outflows)));
  return (
    <section
      data-cashflow-chart
      className={cn("space-y-3 rounded-xl border border-border/60 p-4", className)}
    >
      <p className={gofTypography.title}>Fluxo diário</p>
      {points.length === 0 ? (
        <p className={gofTypography.caption}>Sem pontos no período.</p>
      ) : (
        <ul className="space-y-2">
          {points.map((p) => (
            <li key={p.date} className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{p.date}</span>
                <span>líq. {money(p.net)}</span>
              </div>
              <div className="flex h-2 gap-1 overflow-hidden rounded bg-muted">
                <div
                  className="h-full bg-emerald-600/80"
                  style={{ width: `${(p.inflows / max) * 100}%` }}
                  title={`Entradas ${money(p.inflows)}`}
                />
                <div
                  className="h-full bg-red-600/70"
                  style={{ width: `${(p.outflows / max) * 100}%` }}
                  title={`Saídas ${money(p.outflows)}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
