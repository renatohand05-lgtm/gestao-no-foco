import Link from "next/link";

import { CentroCustoRowActions } from "@/components/financeiro/centro-custo-row-actions";
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

import type { CentroCustoListItem } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  items: CentroCustoListItem[];
};

export function CentroCustoTable({ tenantSlug, items }: Props) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Centro</TableHead>
            <TableHead className="hidden md:table-cell">Código</TableHead>
            <TableHead className="hidden lg:table-cell">Responsável</TableHead>
            <TableHead className="hidden xl:table-cell">Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link href={`/${tenantSlug}/financeiro/centros-custo/${item.id}`} className="block hover:underline">
                  <p className="font-medium">{item.nome}</p>
                  {item.descricao ? <p className="text-xs text-muted-foreground line-clamp-1">{item.descricao}</p> : null}
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell">{item.codigo}</TableCell>
              <TableCell className="hidden lg:table-cell">{item.responsavel || "—"}</TableCell>
              <TableCell className="hidden xl:table-cell"><FinanceiroStatusBadge ativo={item.ativo} /></TableCell>
              <TableCell><CentroCustoRowActions tenantSlug={tenantSlug} item={item} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
  );
}
