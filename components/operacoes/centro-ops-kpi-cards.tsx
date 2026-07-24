import Link from "next/link";

import { MetricCard } from "@/components/executive";
import type { ExColorTone } from "@/lib/design-system/colors";
import { gofGrid } from "@/lib/design-system";
import type { CentroOpsCard } from "@/lib/operacoes/centro-operacoes-service";

const toneMap: Record<NonNullable<CentroOpsCard["tone"]>, ExColorTone> = {
  default: "neutral",
  warn: "warning",
  danger: "danger",
  ok: "success",
};

export function CentroOpsKpiCards({ cards }: { cards: CentroOpsCard[] }) {
  return (
    <div
      className={gofGrid.kpis}
      data-ops-block="centro-kpis"
      role="region"
      aria-label="Indicadores do Centro de Operações"
    >
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.hrefFilter}
          className="block h-full min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40"
          title={`Ver lista: ${card.label}`}
          aria-label={`${card.label}: ${card.count}`}
        >
          <MetricCard
            label={card.label}
            value={card.count}
            hint="Toque para abrir a lista"
            tone={toneMap[card.tone ?? "default"]}
            className="h-full"
          />
        </Link>
      ))}
    </div>
  );
}
