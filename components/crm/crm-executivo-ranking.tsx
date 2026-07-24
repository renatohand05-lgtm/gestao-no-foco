import Link from "next/link";

import {
  CRM_EXEC_RANKING_KEYS,
  CRM_EXEC_RANKING_LABELS,
  crmExecCentralHref,
  segmentTone,
  type CrmExecRankingKey,
  type CrmExecRankingRow,
} from "@/lib/crm/crm-executivo-compose";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  ranking: CrmExecRankingKey;
  rows: CrmExecRankingRow[];
};

function formatValor(key: CrmExecRankingKey, row: CrmExecRankingRow): string {
  if (key === "faturamento" || key === "ticket") {
    return formatCurrency(row.valor);
  }
  return String(row.valor);
}

export function CrmExecutivoRanking({ tenantSlug, ranking, rows }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">TOP 10 Clientes</h2>
          <p className="text-sm text-muted-foreground">
            {CRM_EXEC_RANKING_LABELS[ranking]}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CRM_EXEC_RANKING_KEYS.map((key) => (
            <Link
              key={key}
              href={crmExecCentralHref(tenantSlug, key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                key === ranking
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {CRM_EXEC_RANKING_LABELS[key]}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {rows.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            Nenhum cliente ranqueado.
          </p>
        ) : (
          rows.map((row, idx) => (
            <Link
              key={row.id}
              href={`/${tenantSlug}/clientes/${row.id}`}
              className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">#{idx + 1}</p>
                  <p className="truncate font-medium">{row.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.telefone ?? "Sem telefone"}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded px-2 py-0.5 text-xs font-medium",
                    segmentTone(row.segmento),
                  )}
                >
                  {row.segmento}
                </span>
              </div>
              <p className="mt-3 text-lg font-semibold tabular-nums">
                {formatValor(ranking, row)}
              </p>
            </Link>
          ))
        )}
      </div>

      {/* Tablet/Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-0 text-left text-sm">
          <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Cliente</th>
              <th className="px-3 py-2 font-medium">Segmento</th>
              <th className="px-3 py-2 font-medium">Telefone</th>
              <th className="px-3 py-2 font-medium tabular-nums">Valor</th>
              <th className="hidden px-3 py-2 font-medium tabular-nums lg:table-cell">
                Fat.
              </th>
              <th className="hidden px-3 py-2 font-medium tabular-nums lg:table-cell">
                Visitas
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-muted-foreground">
                  Nenhum cliente ranqueado.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-muted/40">
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/${tenantSlug}/clientes/${row.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.nome}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium",
                        segmentTone(row.segmento),
                      )}
                    >
                      {row.segmento}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.telefone ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-medium tabular-nums">
                    {formatValor(ranking, row)}
                  </td>
                  <td className="hidden px-3 py-2 tabular-nums lg:table-cell">
                    {formatCurrency(row.faturamento)}
                  </td>
                  <td className="hidden px-3 py-2 tabular-nums lg:table-cell">
                    {row.visitas}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
