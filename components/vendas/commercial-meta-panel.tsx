import Link from "next/link";

import type { CiMetaSnapshot } from "@/lib/vendas/commercial-intelligence-types";
import { formatCurrency } from "@/lib/format";

type Props = {
  tenantSlug: string;
  meta: CiMetaSnapshot;
};

export function CommercialMetaPanel({ tenantSlug, meta }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Meta comercial</h2>
          <p className="text-sm text-muted-foreground">
            Motor de metas existente — sem recálculo paralelo.
          </p>
        </div>
        <Link
          href={`/${tenantSlug}/configuracoes/metas`}
          className="text-sm text-primary hover:underline"
        >
          Gerenciar metas
        </Link>
      </div>

      {!meta.available ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Sem meta configurada para o período.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Tile label="Meta" value={formatCurrency(meta.valorMeta ?? 0)} />
          <Tile label="Realizado" value={formatCurrency(meta.realizado)} />
          <Tile
            label="Diferença"
            value={
              meta.diferenca == null ? "—" : formatCurrency(meta.diferenca)
            }
          />
          <Tile
            label="Percentual"
            value={
              meta.percentual == null
                ? "—"
                : `${meta.percentual.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}%`
            }
          />
          <Tile
            label="Projeção"
            value={
              meta.projecao == null ? "—" : formatCurrency(meta.projecao)
            }
          />
          <Tile
            label="Necessário / dia útil"
            value={
              meta.necessarioPorDiaUtil == null
                ? "—"
                : formatCurrency(meta.necessarioPorDiaUtil)
            }
          />
          <Tile
            label="Ritmo atual"
            value={
              meta.ritmoAtual == null
                ? "—"
                : `${meta.ritmoAtual.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}%`
            }
          />
          <Tile
            label="Ritmo esperado"
            value={
              meta.ritmoEsperado == null
                ? "—"
                : `${meta.ritmoEsperado.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}%`
            }
          />
        </div>
      )}
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
