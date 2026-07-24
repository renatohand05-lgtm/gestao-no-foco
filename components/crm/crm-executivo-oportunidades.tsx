import Link from "next/link";

import type {
  CrmExecAcaoItem,
  CrmExecOportunidadeItem,
} from "@/lib/crm/crm-executivo-compose";
import { formatCurrency } from "@/lib/format";

type Props = {
  tenantSlug: string;
  items: CrmExecOportunidadeItem[];
  acoes: CrmExecAcaoItem[];
};

export function CrmExecutivoOportunidades({ tenantSlug, items, acoes }: Props) {
  const visible = items.slice(0, 18);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Oportunidades</h2>
          <p className="text-sm text-muted-foreground">
            Sinais comerciais e operacionais derivados dos dados atuais.
          </p>
        </div>
        {visible.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            Nenhuma oportunidade destacada.
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => (
              <li
                key={item.id}
                className="min-w-0 rounded-lg border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {item.tipoLabel}
                    </p>
                    <Link
                      href={`/${tenantSlug}/clientes/${item.clienteId}`}
                      className="mt-1 block truncate font-medium text-primary hover:underline"
                    >
                      {item.nome}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {item.telefone ?? "Sem telefone"} · {item.detalhe}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCurrency(item.valorPotencial)}
                  </p>
                </div>
                <p className="mt-2 text-sm font-medium">{item.acaoRecomendada}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Ações recomendadas</h2>
          <p className="text-sm text-muted-foreground">
            Regras determinísticas — sem IA.
          </p>
        </div>
        {acoes.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            Nenhuma ação prioritária.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {acoes.map((acao, idx) => (
              <li
                key={`${acao.clienteId}-${idx}`}
                className="flex min-w-0 flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/${tenantSlug}/clientes/${acao.clienteId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {acao.nome}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">
                    {acao.motivo}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium">{acao.acao}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
