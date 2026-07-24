import Link from "next/link";

import { FormaPagamentoRowActions } from "@/components/financeiro/forma-pagamento-row-actions";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import {
  ExecutiveTable,
  type ExecutiveTableColumn,
} from "@/components/executive";
import {
  formatPercent,
  getFormaPagamentoTipoLabel,
} from "@/lib/financeiro/format";
import type { FormaPagamentoListItem } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  items: FormaPagamentoListItem[];
};

export function FormaPagamentoTable({ tenantSlug, items }: Props) {
  const columns: ExecutiveTableColumn<FormaPagamentoListItem>[] = [
    {
      id: "nome",
      header: "Forma",
      cell: (item) => (
        <Link
          href={`/${tenantSlug}/financeiro/formas-pagamento/${item.id}`}
          className="block hover:underline"
        >
          <p className="font-medium">{item.nome}</p>
          <p className="text-xs text-muted-foreground">
            {item.gera_financeiro ? "Gera financeiro" : "Somente registro"}
          </p>
        </Link>
      ),
    },
    {
      id: "tipo",
      header: "Tipo",
      className: "hidden sm:table-cell",
      cell: (item) => getFormaPagamentoTipoLabel(item.tipo),
    },
    {
      id: "compensacao",
      header: "Compensação",
      className: "hidden md:table-cell",
      cell: (item) => `${item.dias_compensacao} dia(s)`,
    },
    {
      id: "taxa",
      header: "Taxa",
      className: "hidden lg:table-cell",
      cell: (item) => formatPercent(item.taxa_percent),
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
        <FormaPagamentoRowActions tenantSlug={tenantSlug} item={item} />
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
