import Link from "next/link";

import { CentroCustoRowActions } from "@/components/financeiro/centro-custo-row-actions";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import {
  ExecutiveTable,
  type ExecutiveTableColumn,
} from "@/components/executive";

import type { CentroCustoListItem } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  items: CentroCustoListItem[];
};

export function CentroCustoTable({ tenantSlug, items }: Props) {
  const columns: ExecutiveTableColumn<CentroCustoListItem>[] = [
    {
      id: "nome",
      header: "Centro",
      cell: (item) => (
        <Link
          href={`/${tenantSlug}/financeiro/centros-custo/${item.id}`}
          className="block hover:underline"
        >
          <p className="font-medium">{item.nome}</p>
          {item.descricao ? (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {item.descricao}
            </p>
          ) : null}
        </Link>
      ),
    },
    {
      id: "codigo",
      header: "Código",
      className: "hidden md:table-cell",
      cell: (item) => item.codigo,
    },
    {
      id: "responsavel",
      header: "Responsável",
      className: "hidden lg:table-cell",
      cell: (item) => item.responsavel || "—",
    },
    {
      id: "status",
      header: "Status",
      className: "hidden xl:table-cell",
      cell: (item) => <FinanceiroStatusBadge ativo={item.ativo} />,
    },
    {
      id: "actions",
      header: "",
      className: "w-12",
      cell: (item) => (
        <CentroCustoRowActions tenantSlug={tenantSlug} item={item} />
      ),
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
