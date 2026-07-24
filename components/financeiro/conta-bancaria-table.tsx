import Link from "next/link";

import { ContaBancariaRowActions } from "@/components/financeiro/conta-bancaria-row-actions";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import {
  ExecutiveTable,
  type ExecutiveTableColumn,
} from "@/components/executive";
import {
  formatCurrency,
  getContaBancariaTipoLabel,
} from "@/lib/financeiro/format";
import type { ContaBancariaListItem } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  items: ContaBancariaListItem[];
};

export function ContaBancariaTable({ tenantSlug, items }: Props) {
  const columns: ExecutiveTableColumn<ContaBancariaListItem>[] = [
    {
      id: "nome",
      header: "Conta",
      cell: (item) => (
        <Link
          href={`/${tenantSlug}/financeiro/contas-bancarias/${item.id}`}
          className="block hover:underline"
        >
          <p className="font-medium">{item.nome}</p>
          <p className="text-xs text-muted-foreground">
            {[item.agencia, item.conta].filter(Boolean).join(" · ") || "—"}
          </p>
        </Link>
      ),
    },
    {
      id: "tipo",
      header: "Tipo",
      className: "hidden sm:table-cell",
      cell: (item) => getContaBancariaTipoLabel(item.tipo),
    },
    {
      id: "banco",
      header: "Banco",
      className: "hidden md:table-cell",
      cell: (item) => item.banco || "—",
    },
    {
      id: "saldo",
      header: "Saldo",
      className: "hidden lg:table-cell",
      cell: (item) =>
        formatCurrency(item.saldo_atual ?? item.saldo_inicial),
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
        <ContaBancariaRowActions tenantSlug={tenantSlug} item={item} />
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
