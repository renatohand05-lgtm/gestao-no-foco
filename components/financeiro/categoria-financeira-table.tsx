import Link from "next/link";

import { CategoriaFinanceiraRowActions } from "@/components/financeiro/categoria-financeira-row-actions";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import {
  ExecutiveTable,
  type ExecutiveTableColumn,
} from "@/components/executive";
import { formatDreHierarchyPath, type DreLinhaEconomica } from "@/lib/dre";
import { getCategoriaFinanceiraTipoLabel } from "@/lib/financeiro/format";
import type { CategoriaFinanceiraListItem } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  items: CategoriaFinanceiraListItem[];
};

export function CategoriaFinanceiraTable({ tenantSlug, items }: Props) {
  const columns: ExecutiveTableColumn<CategoriaFinanceiraListItem>[] = [
    {
      id: "nome",
      header: "Categoria",
      cell: (item) => (
        <Link
          href={`/${tenantSlug}/financeiro/categorias/${item.id}`}
          className="block hover:underline"
        >
          <p className="font-medium">{item.nome}</p>
        </Link>
      ),
    },
    {
      id: "tipo",
      header: "Tipo",
      className: "hidden sm:table-cell",
      cell: (item) => getCategoriaFinanceiraTipoLabel(item.tipo),
    },
    {
      id: "dre",
      header: "Linha DRE",
      className: "hidden md:table-cell text-sm",
      cell: (item) =>
        item.dre_linha ? (
          formatDreHierarchyPath(
            item.dre_linha as DreLinhaEconomica,
            item.dre_detalhe,
          )
        ) : (
          <span className="text-amber-800">Pendente</span>
        ),
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
        <CategoriaFinanceiraRowActions tenantSlug={tenantSlug} item={item} />
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
