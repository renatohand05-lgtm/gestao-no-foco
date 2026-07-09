import Link from "next/link";

import { PlanoContaRowActions } from "@/components/financeiro/plano-conta-row-actions";
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
  getPlanoContaNaturezaLabel,
  getPlanoContaTipoLabel,
} from "@/lib/financeiro/format";
import type { PlanoContaListItem } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  items: PlanoContaListItem[];
};

export function PlanoContaTable({ tenantSlug, items }: Props) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Conta</TableHead>
            <TableHead className="hidden md:table-cell">Código</TableHead>
            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
            <TableHead className="hidden lg:table-cell">Natureza</TableHead>
            <TableHead className="hidden xl:table-cell">Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link href={`/${tenantSlug}/financeiro/plano-contas/${item.id}`} className="block hover:underline">
                  <p className="font-medium">{item.nome}</p>
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell">{item.codigo}</TableCell>
              <TableCell className="hidden sm:table-cell">{getPlanoContaTipoLabel(item.tipo)}</TableCell>
              <TableCell className="hidden lg:table-cell">{getPlanoContaNaturezaLabel(item.natureza)}</TableCell>
              <TableCell className="hidden xl:table-cell"><FinanceiroStatusBadge ativo={item.ativo} /></TableCell>
              <TableCell><PlanoContaRowActions tenantSlug={tenantSlug} item={item} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
  );
}
