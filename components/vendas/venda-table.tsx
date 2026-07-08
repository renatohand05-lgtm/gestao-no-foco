import Link from "next/link";

import { VendaRowActions } from "@/components/vendas/venda-row-actions";
import { VendaStatusBadge } from "@/components/vendas/venda-status-badge";
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
  formatCurrency,
  formatVendaDate,
  formatVendaDateTime,
  formatVendaNumero,
} from "@/lib/vendas/format";
import type { VendaListItem } from "@/types/vendas";

type VendaTableProps = {
  tenantSlug: string;
  vendas: VendaListItem[];
};

export function VendaTable({ tenantSlug, vendas }: VendaTableProps) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden sm:table-cell">Data</TableHead>
            <TableHead className="hidden md:table-cell">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden xl:table-cell">Cadastro</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendas.map((venda) => (
            <TableRow key={venda.id}>
              <TableCell>
                <Link
                  href={`/${tenantSlug}/vendas/${venda.id}`}
                  className="font-medium hover:underline"
                >
                  {formatVendaNumero(venda.numero)}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/${tenantSlug}/vendas/${venda.id}`}
                  className="block hover:underline"
                >
                  <p className="font-medium">{venda.cliente.nome}</p>
                  {venda.cliente.documento ? (
                    <p className="text-xs text-muted-foreground">
                      {venda.cliente.documento}
                    </p>
                  ) : null}
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {formatVendaDate(venda.data_venda)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {formatCurrency(venda.total)}
              </TableCell>
              <TableCell>
                <VendaStatusBadge status={venda.status} />
              </TableCell>
              <TableCell className="hidden xl:table-cell text-muted-foreground">
                {formatVendaDateTime(venda.created_at)}
              </TableCell>
              <TableCell>
                <VendaRowActions tenantSlug={tenantSlug} venda={venda} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
  );
}
