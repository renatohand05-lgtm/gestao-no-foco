import type { CommercialIntelligenceData } from "@/lib/vendas/commercial-intelligence-types";
import { formatCurrency } from "@/lib/format";

type Props = {
  data: CommercialIntelligenceData["descontos"];
};

export function CommercialDiscountPanel({ data }: Props) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Descontos</h2>
        <p className="text-sm text-muted-foreground">
          Concedidos em vendas faturadas do período. Regras de autorização
          permanecem no módulo de descontos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Total concedido"
          value={formatCurrency(data.totalConcedido)}
        />
        <Metric
          label="% sobre vendas"
          value={
            data.percentualSobreVendas == null
              ? "Indisponível"
              : `${data.percentualSobreVendas.toLocaleString("pt-BR")}%`
          }
        />
        <Metric
          label="Vendas com desconto"
          value={String(data.quantidadeComDesconto)}
        />
        <Metric
          label="Desconto médio"
          value={
            data.descontoMedio == null
              ? "Indisponível"
              : formatCurrency(data.descontoMedio)
          }
        />
      </div>

      {data.maiores.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum desconto no período.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {data.maiores.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
            >
              <span className="min-w-0 truncate">{row.label}</span>
              <span className="shrink-0 tabular-nums font-medium">
                {formatCurrency(row.valor)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
