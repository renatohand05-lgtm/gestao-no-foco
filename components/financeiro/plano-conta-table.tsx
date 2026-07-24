import Link from "next/link";

import { PlanoContaRowActions } from "@/components/financeiro/plano-conta-row-actions";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import {
  ExecutiveTable,
  type ExecutiveTableColumn,
} from "@/components/executive";
import {
  getPlanoContaNaturezaLabel,
  getPlanoContaTipoLabel,
} from "@/lib/financeiro/format";
import type { PlanoContaListItem } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  items: PlanoContaListItem[];
};

export function PlanoContaTable({ tenantSlug, items }: Props) {
  const columns: ExecutiveTableColumn<PlanoContaListItem>[] = [
    {
      id: "nome",
      header: "Conta",
      cell: (item) => (
        <Link
          href={`/${tenantSlug}/financeiro/plano-contas/${item.id}`}
          className="block hover:underline"
        >
          <p className="font-medium">{item.nome}</p>
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
      id: "tipo",
      header: "Tipo",
      className: "hidden sm:table-cell",
      cell: (item) => getPlanoContaTipoLabel(item.tipo),
    },
    {
      id: "natureza",
      header: "Natureza",
      className: "hidden lg:table-cell",
      cell: (item) => getPlanoContaNaturezaLabel(item.natureza),
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
        <PlanoContaRowActions tenantSlug={tenantSlug} item={item} />
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
