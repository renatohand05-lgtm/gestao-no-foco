import Link from "next/link";

import type { CentroOpsCard } from "@/lib/operacoes/centro-operacoes-service";
import { cn } from "@/lib/utils";

const toneClass: Record<NonNullable<CentroOpsCard["tone"]>, string> = {
  default: "hover:border-foreground/25",
  warn: "border-amber-400/50 hover:border-amber-500",
  danger: "border-rose-400/60 hover:border-rose-500",
  ok: "border-emerald-400/50 hover:border-emerald-500",
};

export function CentroOpsKpiCards({ cards }: { cards: CentroOpsCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.hrefFilter}
          className={cn(
            "rounded-xl border bg-card p-4 transition",
            toneClass[card.tone ?? "default"],
          )}
          title={`Ver lista: ${card.label}`}
        >
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {card.count}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Toque para abrir a lista
          </p>
        </Link>
      ))}
    </div>
  );
}
