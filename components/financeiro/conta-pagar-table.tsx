import Link from "next/link";

import { ContaPagarRowActions } from "@/components/financeiro/conta-pagar-row-actions";
import { ContaPagarStatusBadge } from "@/components/financeiro/conta-pagar-status-badge";
import {
  ExecutiveTable,
  type ExecutiveTableColumn,
} from "@/components/executive";
import {
  calcSaldoPendente,
  formatContaPagarNumero,
  resolveFornecedorNome,
} from "@/lib/financeiro/conta-pagar-utils";
import { formatCurrency, formatDateOnly } from "@/lib/financeiro/format";
import type { ContaPagarListItem } from "@/types/contas-pagar";

type Props = {
  tenantSlug: string;
  items: ContaPagarListItem[];
  formasPagamento?: { id: string; nome: string }[];
  contasBancarias?: { id: string; nome: string }[];
};

export function ContaPagarTable({
  tenantSlug,
  items,
  formasPagamento = [],
  contasBancarias = [],
}: Props) {
  const columns: ExecutiveTableColumn<ContaPagarListItem>[] = [
    {
      id: "titulo",
      header: "Título",
      cell: (item) => (
        <Link
          href={`/${tenantSlug}/financeiro/contas-pagar/${item.id}`}
          className="block hover:underline"
        >
          <p className="font-medium">{formatContaPagarNumero(item.numero)}</p>
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
      id: "fornecedor",
      header: "Beneficiário",
      className: "hidden sm:table-cell",
      cell: (item) => resolveFornecedorNome(item),
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
        item.status_exibicao === "pago"
          ? formatCurrency(item.valor_pago)
          : formatCurrency(calcSaldoPendente(item)),
    },
    {
      id: "status",
      header: "Status",
      className: "hidden xl:table-cell",
      cell: (item) => <ContaPagarStatusBadge status={item.status_exibicao} />,
    },
    {
      id: "actions",
      header: "",
      className: "w-12",
      cell: (item) => (
        <ContaPagarRowActions
          tenantSlug={tenantSlug}
          item={item}
          formasPagamento={formasPagamento}
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
