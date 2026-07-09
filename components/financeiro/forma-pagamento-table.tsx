import Link from "next/link";

import { FormaPagamentoRowActions } from "@/components/financeiro/forma-pagamento-row-actions";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
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
  formatPercent,
  getFormaPagamentoTipoLabel,
} from "@/lib/financeiro/format";
import type { FormaPagamentoListItem } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  items: FormaPagamentoListItem[];
};

export function FormaPagamentoTable({ tenantSlug, items }: Props) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Forma</TableHead>
            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
            <TableHead className="hidden md:table-cell">Compensação</TableHead>
            <TableHead className="hidden lg:table-cell">Taxa</TableHead>
            <TableHead className="hidden xl:table-cell">Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link href={`/${tenantSlug}/financeiro/formas-pagamento/${item.id}`} className="block hover:underline">
                  <p className="font-medium">{item.nome}</p>
                  <p className="text-xs text-muted-foreground">{item.gera_financeiro ? "Gera financeiro" : "Somente registro"}</p>
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{getFormaPagamentoTipoLabel(item.tipo)}</TableCell>
              <TableCell className="hidden md:table-cell">{item.dias_compensacao} dia(s)</TableCell>
              <TableCell className="hidden lg:table-cell">{formatPercent(item.taxa_percent)}</TableCell>
              <TableCell className="hidden xl:table-cell"><FinanceiroStatusBadge ativo={item.ativo} /></TableCell>
              <TableCell><FormaPagamentoRowActions tenantSlug={tenantSlug} item={item} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
  );
}
