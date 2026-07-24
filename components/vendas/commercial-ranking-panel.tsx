import type { CiRankingRow } from "@/lib/vendas/commercial-intelligence-types";
import { formatCurrency } from "@/lib/format";

type Props = {
  title: string;
  description?: string;
  rows: CiRankingRow[];
  emptyLabel?: string;
  valueKind?: "currency" | "number";
};

export function CommercialRankingPanel({
  title,
  description,
  rows,
  emptyLabel = "Sem dados no período.",
  valueKind = "currency",
}: Props) {
  return (
    <section className="min-w-0 rounded-lg border bg-card p-4">
      <h3 className="font-semibold">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="mt-3 space-y-2 md:hidden">
            {rows.map((row, idx) => (
              <li
                key={row.key}
                className="flex items-start justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    #{idx + 1} {row.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.quantidade}×
                    {row.ticketMedio != null
                      ? ` · ticket ${formatCurrency(row.ticketMedio)}`
                      : ""}
                    {row.participacaoPct != null
                      ? ` · ${row.participacaoPct}%`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums font-medium">
                  {valueKind === "currency"
                    ? formatCurrency(row.valor)
                    : row.valor.toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full min-w-0 text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 font-medium">#</th>
                  <th className="px-2 py-1.5 font-medium">Nome</th>
                  <th className="px-2 py-1.5 font-medium tabular-nums">Qtd</th>
                  <th className="px-2 py-1.5 font-medium tabular-nums">Valor</th>
                  <th className="hidden px-2 py-1.5 font-medium tabular-nums lg:table-cell">
                    Ticket
                  </th>
                  <th className="px-2 py-1.5 font-medium tabular-nums">%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row, idx) => (
                  <tr key={row.key}>
                    <td className="px-2 py-1.5 text-muted-foreground">{idx + 1}</td>
                    <td className="max-w-[12rem] truncate px-2 py-1.5">
                      {row.label}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">{row.quantidade}</td>
                    <td className="px-2 py-1.5 tabular-nums font-medium">
                      {valueKind === "currency"
                        ? formatCurrency(row.valor)
                        : row.valor.toLocaleString("pt-BR")}
                    </td>
                    <td className="hidden px-2 py-1.5 tabular-nums lg:table-cell">
                      {row.ticketMedio != null
                        ? formatCurrency(row.ticketMedio)
                        : "—"}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {row.participacaoPct != null
                        ? `${row.participacaoPct}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
