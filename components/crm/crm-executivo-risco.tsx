import Link from "next/link";

import type { CrmExecRiscoItem } from "@/lib/crm/crm-executivo-compose";
import { formatCurrency } from "@/lib/format";

type Props = {
  tenantSlug: string;
  items: CrmExecRiscoItem[];
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export function CrmExecutivoRisco({ tenantSlug, items }: Props) {
  const visible = items.slice(0, 24);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Clientes em risco</h2>
        <p className="text-sm text-muted-foreground">
          Retorno atrasado, orçamentos e revisões que pedem ação.
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Nenhum cliente em risco no momento.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visible.map((item) => {
            const clienteId = item.id.split(":")[0]!;
            return (
              <article
                key={item.id}
                className="min-w-0 rounded-lg border border-amber-200/80 bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/${tenantSlug}/clientes/${clienteId}`}
                      className="block truncate font-medium text-primary hover:underline"
                    >
                      {item.nome}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {item.telefone ?? "Sem telefone"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-950">
                    {item.motivoLabel}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Última OS/venda (proxy)</dt>
                    <dd>{formatDate(item.ultimaVisita)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Dias sem retorno</dt>
                    <dd className="tabular-nums">
                      {item.diasSemRetorno ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Valor potencial</dt>
                    <dd className="tabular-nums">
                      {formatCurrency(item.valorPotencial)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Ação recomendada</dt>
                    <dd className="font-medium">{item.acaoRecomendada}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
