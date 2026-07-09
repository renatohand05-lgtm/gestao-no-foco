import Link from "next/link";

import { ContaReceberRowActions } from "@/components/financeiro/conta-receber-row-actions";
import { ContaReceberStatusBadge } from "@/components/financeiro/conta-receber-status-badge";
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
  formatContaReceberNumero,
} from "@/lib/financeiro/conta-receber-utils";
import { formatCurrency, formatDateOnly } from "@/lib/financeiro/format";
import type { ContaReceberListItem } from "@/types/contas-receber";

type Props = {
  tenantSlug: string;
  items: ContaReceberListItem[];
};

export function ContaReceberTable({ tenantSlug, items }: Props) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead className="hidden sm:table-cell">Cliente</TableHead>
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
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {item.cliente.nome}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDateOnly(item.data_vencimento)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {item.status_exibicao === "recebido"
                    ? formatCurrency(item.valor_recebido)
                    : formatCurrency(saldo)}
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <ContaReceberStatusBadge status={item.status_exibicao} />
                </TableCell>
                <TableCell>
                  <ContaReceberRowActions tenantSlug={tenantSlug} item={item} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTable>
  );
}
