import Link from "next/link";
import { Eye } from "lucide-react";

import { EstoqueTipoBadge } from "@/components/estoque/estoque-tipo-badge";
import { Button } from "@/components/ui/button";
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
  formatMovimentacaoDate,
  formatQuantity,
  getOrigemLabel,
} from "@/lib/estoque/format";
import type { EstoqueMovimentacaoListItem } from "@/types/estoque";

type EstoqueTableProps = {
  tenantSlug: string;
  movimentacoes: EstoqueMovimentacaoListItem[];
};

export function EstoqueTable({ tenantSlug, movimentacoes }: EstoqueTableProps) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
            <TableHead className="hidden md:table-cell">Quantidade</TableHead>
            <TableHead className="hidden lg:table-cell">Saldo final</TableHead>
            <TableHead className="hidden xl:table-cell">Origem</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {movimentacoes.map((movimentacao) => (
            <TableRow key={movimentacao.id}>
              <TableCell className="text-sm text-muted-foreground">
                {formatMovimentacaoDate(movimentacao.created_at)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/${tenantSlug}/estoque/${movimentacao.id}`}
                  className="block hover:underline"
                >
                  <p className="font-medium">
                    {movimentacao.produto?.nome ?? "Produto"}
                  </p>
                  {movimentacao.produto?.sku ? (
                    <p className="text-xs text-muted-foreground">
                      SKU: {movimentacao.produto.sku}
                    </p>
                  ) : null}
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <EstoqueTipoBadge tipo={movimentacao.tipo} />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {formatQuantity(
                  movimentacao.quantidade,
                  movimentacao.produto?.unidade_medida,
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {formatQuantity(
                  movimentacao.quantidade_nova,
                  movimentacao.produto?.unidade_medida,
                )}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                {getOrigemLabel(movimentacao.origem)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  render={
                    <Link href={`/${tenantSlug}/estoque/${movimentacao.id}`} />
                  }
                >
                  <Eye className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
  );
}
