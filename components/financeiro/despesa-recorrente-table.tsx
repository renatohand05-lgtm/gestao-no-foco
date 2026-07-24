import Link from "next/link";

import {
  ExecutiveTable,
  type ExecutiveTableColumn,
} from "@/components/executive";
import { formatCurrency, formatDateOnly } from "@/lib/financeiro/format";
import type { DespesaRecorrente } from "@/lib/financeiro/despesa-recorrente-service";

type Props = {
  tenantSlug: string;
  items: DespesaRecorrente[];
};

export function DespesaRecorrenteTable({ tenantSlug, items }: Props) {
  const columns: ExecutiveTableColumn<DespesaRecorrente>[] = [
    {
      id: "descricao",
      header: "Descrição",
      cell: (item) => (
        <>
          <Link
            href={`/${tenantSlug}/financeiro/despesas-recorrentes/${item.id}`}
            className="font-medium hover:underline"
          >
            {item.descricao}
          </Link>
          <p className="text-xs text-muted-foreground sm:hidden">
            {formatCurrency(Number(item.valor))}
          </p>
        </>
      ),
    },
    {
      id: "valor",
      header: "Valor",
      className: "hidden sm:table-cell tabular-nums",
      cell: (item) => formatCurrency(Number(item.valor)),
    },
    {
      id: "proxima",
      header: "Próxima",
      className: "hidden md:table-cell",
      cell: (item) =>
        item.proxima_competencia
          ? formatDateOnly(item.proxima_competencia)
          : "—",
    },
    {
      id: "status",
      header: "Status",
      className: "hidden lg:table-cell text-sm",
      cell: (item) =>
        `${
          !item.ativo ? "Encerrada" : item.pausada ? "Pausada" : "Ativa"
        } · ${item.ocorrencias_geradas} gerada(s)`,
    },
  ];

  return (
    <ExecutiveTable
      columns={columns}
      rows={items}
      getRowId={(row) => row.id}
      density="comfortable"
      stickyHeader
    />
  );
}
