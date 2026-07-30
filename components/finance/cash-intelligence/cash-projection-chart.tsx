"use client";

import type { CashProjectionResult } from "@/lib/finance/cash-intelligence";
import { cn } from "@/lib/utils";

type Props = {
  projection: CashProjectionResult;
  className?: string;
};

function money(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function CashProjectionChart({ projection, className }: Props) {
  const points = projection.points;
  if (points.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/60 p-6 text-sm text-muted-foreground",
          className,
        )}
      >
        Sem pontos de projeção para exibir.
      </div>
    );
  }

  const min = Math.min(...points.map((p) => p.closing), 0);
  const max = Math.max(...points.map((p) => p.closing), 1);
  const span = Math.max(max - min, 1);
  const w = 640;
  const h = 180;
  const path = points
    .map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * (w - 24) + 12;
      const y = h - 12 - ((p.closing - min) / span) * (h - 24);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <section
      aria-label="Gráfico de evolução do saldo projetado"
      className={cn(
        "rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5",
        className,
      )}
    >
      <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Evolução do saldo projetado</h2>
          <p className="text-xs text-muted-foreground">
            Horizonte {projection.horizonDays}d · {projection.from} → {projection.to} ·
            confiança {projection.confidence}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Inicial</dt>
            <dd className="font-medium tabular-nums">{money(projection.openingBalance)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Final</dt>
            <dd className="font-medium tabular-nums">{money(projection.closingBalance)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Mínimo</dt>
            <dd className="font-medium tabular-nums">{money(projection.minBalance)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Dias negativos</dt>
            <dd className="font-medium tabular-nums">{projection.negativeDays}</dd>
          </div>
        </dl>
      </header>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-44 w-full"
        role="img"
        aria-label={`Saldo de ${money(projection.openingBalance)} para ${money(projection.closingBalance)}`}
      >
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-emerald-700"
        />
        {projection.ruptureDate ? (
          <text x="12" y="16" className="fill-red-700 text-[11px]">
            Ruptura: {projection.ruptureDate}
          </text>
        ) : null}
      </svg>
    </section>
  );
}
