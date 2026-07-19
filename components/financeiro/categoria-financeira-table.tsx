import Link from "next/link";

import { CategoriaFinanceiraRowActions } from "@/components/financeiro/categoria-financeira-row-actions";
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
import { formatDreHierarchyPath, type DreLinhaEconomica } from "@/lib/dre";
import { getCategoriaFinanceiraTipoLabel } from "@/lib/financeiro/format";
import type { CategoriaFinanceiraListItem } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  items: CategoriaFinanceiraListItem[];
};

export function CategoriaFinanceiraTable({ tenantSlug, items }: Props) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Categoria</TableHead>
            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
            <TableHead className="hidden md:table-cell">Linha DRE</TableHead>
            <TableHead className="hidden xl:table-cell">Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link
                  href={`/${tenantSlug}/financeiro/categorias/${item.id}`}
                  className="block hover:underline"
                >
                  <p className="font-medium">{item.nome}</p>
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {getCategoriaFinanceiraTipoLabel(item.tipo)}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                {item.dre_linha ? (
                  formatDreHierarchyPath(
                    item.dre_linha as DreLinhaEconomica,
                    item.dre_detalhe,
                  )
                ) : (
                  <span className="text-amber-800">Pendente</span>
                )}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <FinanceiroStatusBadge ativo={item.ativo} />
              </TableCell>
              <TableCell>
                <CategoriaFinanceiraRowActions
                  tenantSlug={tenantSlug}
                  item={item}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
  );
}
