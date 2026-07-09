import Link from "next/link";

import { ContaPagarRowActions } from "@/components/financeiro/conta-pagar-row-actions";
import { ContaPagarStatusBadge } from "@/components/financeiro/conta-pagar-status-badge";
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
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
};

export function ContaPagarTable({ tenantSlug, items }: Props) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead className="hidden sm:table-cell">Fornecedor</TableHead>
            <TableHead className="hidden md:table-cell">Vencimento</TableHead>
            <TableHead className="hidden lg:table-cell">Valor</TableHead>
            <TableHead className="hidden xl:table-cell">Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const saldo = calcSaldoPendente(item);

            return (
              <TableRow key={item.id}>
                <TableCell>
                  <Link
                    href={`/${tenantSlug}/financeiro/contas-pagar/${item.id}`}
                    className="block hover:underline"
                  >
                    <p className="font-medium">
                      {formatContaPagarNumero(item.numero)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.descricao}
                      {item.parcela_total > 1
                        ? ` · ${item.parcela_numero}/${item.parcela_total}`
                        : ""}
                    </p>
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {resolveFornecedorNome(item)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDateOnly(item.data_vencimento)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {item.status_exibicao === "pago"
                    ? formatCurrency(item.valor_pago)
                    : formatCurrency(saldo)}
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <ContaPagarStatusBadge status={item.status_exibicao} />
                </TableCell>
                <TableCell>
                  <ContaPagarRowActions tenantSlug={tenantSlug} item={item} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTable>
  );
}
