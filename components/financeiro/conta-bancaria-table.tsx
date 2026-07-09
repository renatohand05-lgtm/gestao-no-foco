import Link from "next/link";

import { ContaBancariaRowActions } from "@/components/financeiro/conta-bancaria-row-actions";
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
  formatCurrency,
  getContaBancariaTipoLabel,
} from "@/lib/financeiro/format";
import type { ContaBancariaListItem } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  items: ContaBancariaListItem[];
};

export function ContaBancariaTable({ tenantSlug, items }: Props) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Conta</TableHead>
            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
            <TableHead className="hidden md:table-cell">Banco</TableHead>
            <TableHead className="hidden lg:table-cell">Saldo inicial</TableHead>
            <TableHead className="hidden xl:table-cell">Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link href={`/${tenantSlug}/financeiro/contas-bancarias/${item.id}`} className="block hover:underline">
                  <p className="font-medium">{item.nome}</p>
                  <p className="text-xs text-muted-foreground">{[item.agencia, item.conta].filter(Boolean).join(" · ") || "—"}</p>
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{getContaBancariaTipoLabel(item.tipo)}</TableCell>
              <TableCell className="hidden md:table-cell">{item.banco || "—"}</TableCell>
              <TableCell className="hidden lg:table-cell">{formatCurrency(item.saldo_inicial)}</TableCell>
              <TableCell className="hidden xl:table-cell"><FinanceiroStatusBadge ativo={item.ativo} /></TableCell>
              <TableCell><ContaBancariaRowActions tenantSlug={tenantSlug} item={item} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
  );
}
