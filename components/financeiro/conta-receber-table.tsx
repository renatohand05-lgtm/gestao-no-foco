import Link from "next/link";

import { ContaReceberRowActions } from "@/components/financeiro/conta-receber-row-actions";
import { ContaReceberStatusBadge } from "@/components/financeiro/conta-receber-status-badge";
import {
  ExecutiveTable,
  type ExecutiveTableColumn,
} from "@/components/executive";
import {
  calcSaldoPendente,
  formatContaReceberNumero,
} from "@/lib/financeiro/conta-receber-utils";
import { formatCurrency, formatDateOnly } from "@/lib/financeiro/format";
import type { ContaReceberListItem } from "@/types/contas-receber";

type Props = {
  tenantSlug: string;
  items: ContaReceberListItem[];
  contasBancarias: { id: string; nome: string }[];
};

export function ContaReceberTable({
  tenantSlug,
  items,
  contasBancarias,
}: Props) {
  const columns: ExecutiveTableColumn<ContaReceberListItem>[] = [
    {
      id: "titulo",
      header: "Título",
      cell: (item) => (
        <Link
          href={`/${tenantSlug}/financeiro/contas-receber/${item.id}`}
          className="block hover:underline"
        >
          <p className="font-medium">
            {formatContaReceberNumero(item.numero)}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.descricao}
            {item.parcela_total > 1
              ? ` · ${item.parcela_numero}/${item.parcela_total}`
              : ""}
          </p>
        </Link>
      ),
    },
    {
      id: "cliente",
      header: "Cliente",
      className: "hidden sm:table-cell",
      cell: (item) => item.cliente.nome,
    },
    {
      id: "vencimento",
      header: "Vencimento",
      className: "hidden md:table-cell",
      cell: (item) => formatDateOnly(item.data_vencimento),
    },
    {
      id: "valor",
      header: "Valor",
      className: "hidden lg:table-cell",
      cell: (item) =>
        item.status_exibicao === "recebido"
          ? formatCurrency(item.valor_recebido)
          : formatCurrency(calcSaldoPendente(item)),
    },
    {
      id: "status",
      header: "Status",
      className: "hidden xl:table-cell",
      cell: (item) => (
        <ContaReceberStatusBadge status={item.status_exibicao} />
      ),
    },
    {
      id: "actions",
      header: "",
      className: "w-12",
      cell: (item) => (
        <ContaReceberRowActions
          tenantSlug={tenantSlug}
          item={item}
          contasBancarias={contasBancarias}
        />
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
