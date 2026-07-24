import type {
  CiOficinaStrip,
  CiPipelineStageRow,
} from "@/lib/vendas/commercial-intelligence-types";
import { formatCurrency } from "@/lib/format";

type Props = {
  pipeline: CiPipelineStageRow[];
  oficina: CiOficinaStrip;
};

export function CommercialPipeline({ pipeline, oficina }: Props) {
  const maxValor = Math.max(1, ...pipeline.map((p) => p.valor));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Pipeline comercial</h2>
        <p className="text-sm text-muted-foreground">
          Somente status reais de vendas.
        </p>
        <p className="text-xs text-muted-foreground">
          Histórico de etapa indisponível.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {pipeline.map((stage) => (
          <article
            key={stage.stage}
            className="min-w-0 rounded-lg border bg-card p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {stage.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {stage.quantidade}
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatCurrency(stage.valor)}
              {stage.participacaoPct != null
                ? ` · ${stage.participacaoPct.toLocaleString("pt-BR")}%`
                : ""}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded bg-muted">
              <div
                className="h-full rounded bg-primary/80"
                style={{
                  width: `${Math.max(4, (stage.valor / maxValor) * 100)}%`,
                }}
              />
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-dashed p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="font-semibold">Oficina</h3>
            <p className="text-sm text-muted-foreground">
              Faixa informativa — não altera o pipeline comercial nem a taxa de
              conversão.
            </p>
          </div>
          <p className="text-sm tabular-nums">
            {oficina.quantidade} OS · {formatCurrency(oficina.valor)}
          </p>
        </div>
        {oficina.porStatus.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sem orçamentos de oficina abertos.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {oficina.porStatus.map((s) => (
              <li
                key={s.status}
                className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
              >
                <span>{s.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {s.quantidade} · {formatCurrency(s.valor)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
