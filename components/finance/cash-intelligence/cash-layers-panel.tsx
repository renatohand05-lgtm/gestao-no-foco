import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import type { CashLayersResult } from "@/lib/finance/cash-intelligence";

type Props = { layers: CashLayersResult };

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CashLayersPanel({ layers }: Props) {
  return (
    <section
      aria-label="Camadas realizado previsto projetado"
      className="rounded-xl border border-border/60 bg-card/40 p-4"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">Camadas de fluxo</h2>
        <ExecutiveBadge tone="info" variant="outline">
          {layers.confidence}
        </ExecutiveBadge>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{layers.confidenceReason}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Layer
          title="REALIZADO"
          tone="success"
          inflows={layers.totals.realizedIn}
          outflows={layers.totals.realizedOut}
          count={layers.realized.filter((l) => l.status !== "transfer").length}
        />
        <Layer
          title="PREVISTO"
          tone="warning"
          inflows={layers.totals.forecastIn}
          outflows={layers.totals.forecastOut}
          count={layers.forecast.length}
        />
        <Layer
          title="PROJETADO"
          tone="info"
          inflows={layers.totals.projectedIn}
          outflows={layers.totals.projectedOut}
          count={layers.projected.length}
        />
      </div>
    </section>
  );
}

function Layer({
  title,
  tone,
  inflows,
  outflows,
  count,
}: {
  title: string;
  tone: "success" | "warning" | "info";
  inflows: number;
  outflows: number;
  count: number;
}) {
  return (
    <div className="rounded-lg border border-border/50 px-3 py-3">
      <ExecutiveBadge tone={tone}>{title}</ExecutiveBadge>
      <p className="mt-2 text-xs text-muted-foreground">{count} linha(s)</p>
      <p className="text-sm tabular-nums">Entradas {money(inflows)}</p>
      <p className="text-sm tabular-nums">Saídas {money(outflows)}</p>
    </div>
  );
}
