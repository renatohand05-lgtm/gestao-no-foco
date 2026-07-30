import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import type { WorkingCapitalResult } from "@/lib/finance/cash-intelligence";

type Props = { wc: WorkingCapitalResult };

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function WorkingCapitalCard({ wc }: Props) {
  return (
    <section
      aria-label="Capital de giro necessário"
      className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5"
      title={wc.methodology}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Capital de giro</h2>
        <ExecutiveBadge
          tone={
            wc.confidence === "low"
              ? "warning"
              : wc.confidence === "high"
                ? "success"
                : "info"
          }
        >
          confiança {wc.confidence}
        </ExecutiveBadge>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        <Item label="Mínimo" value={money(wc.minimum)} />
        <Item label="Recomendado" value={money(wc.recommended)} />
        <Item label="Reserva de segurança" value={money(wc.safetyReserve)} />
        <Item label="Déficit atual" value={money(wc.deficit)} />
        <Item label="Excesso atual" value={money(wc.surplus)} />
        <Item label="Horizonte" value={`${wc.horizonDays} dias`} />
      </dl>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Estimativa rastreável — não é certeza absoluta. Passe o rato no cartão para a
        metodologia. Placeholders: {wc.placeholderFields.join(", ") || "nenhum"}.
      </p>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
