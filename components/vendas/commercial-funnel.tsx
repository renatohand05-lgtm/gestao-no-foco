import type { CiKpis } from "@/lib/vendas/commercial-intelligence-types";

type Props = {
  kpis: CiKpis;
};

export function CommercialFunnel({ kpis }: Props) {
  const elegiveis = kpis.conversaoDenominador;
  const faturadas = kpis.conversaoNumerador;
  const max = Math.max(1, elegiveis);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Funil de conversão</h2>
        <p className="text-sm text-muted-foreground">
          Uma única taxa oficial. OS da faixa Oficina não entra no denominador.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <FunnelBar
          label="Vendas elegíveis criadas no período"
          value={elegiveis}
          widthPct={100}
        />
        <FunnelBar
          label="Vendas faturadas (mesmo cohort)"
          value={faturadas}
          widthPct={(faturadas / max) * 100}
        />
        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          <p className="font-medium">Taxa de conversão comercial</p>
          <p className="tabular-nums">
            {kpis.taxaConversaoComercial.available &&
            kpis.taxaConversaoComercial.value != null
              ? `${kpis.taxaConversaoComercial.value.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                })}%`
              : "Indisponível"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {kpis.conversaoFormula}
          </p>
        </div>
      </div>
    </section>
  );
}

function FunnelBar({
  label,
  value,
  widthPct,
}: {
  label: string;
  value: number;
  widthPct: number;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="tabular-nums font-medium">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-muted">
        <div
          className="h-full rounded bg-primary/80"
          style={{ width: `${Math.max(value > 0 ? 4 : 0, widthPct)}%` }}
        />
      </div>
    </div>
  );
}
