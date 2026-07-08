import Link from "next/link";

import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatQuantity, isEstoqueBaixo } from "@/lib/estoque/format";
import type { EstoqueProdutoResumo } from "@/types/estoque";

type EstoqueProdutosTableProps = {
  tenantSlug: string;
  produtos: EstoqueProdutoResumo[];
};

export function EstoqueProdutosTable({
  tenantSlug,
  produtos,
}: EstoqueProdutosTableProps) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead className="hidden md:table-cell">Categoria</TableHead>
            <TableHead>Estoque atual</TableHead>
            <TableHead className="hidden sm:table-cell">Mínimo</TableHead>
            <TableHead className="hidden lg:table-cell">Máximo</TableHead>
            <TableHead className="hidden sm:table-cell">Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtos.map((produto) => {
            const baixo = isEstoqueBaixo(
              produto.estoque_atual,
              produto.estoque_minimo,
            );

            return (
              <TableRow key={produto.id}>
                <TableCell>
                  <Link
                    href={`/${tenantSlug}/produtos/${produto.id}`}
                    className="block hover:underline"
                  >
                    <p className="font-medium">{produto.nome}</p>
                    {produto.sku ? (
                      <p className="text-xs text-muted-foreground">
                        SKU: {produto.sku}
                      </p>
                    ) : null}
                  </Link>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {produto.categoria || "—"}
                </TableCell>
                <TableCell>
                  {formatQuantity(produto.estoque_atual, produto.unidade_medida)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {formatQuantity(produto.estoque_minimo, produto.unidade_medida)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {formatQuantity(produto.estoque_maximo, produto.unidade_medida)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {baixo ? (
                    <StatusBadge label="Abaixo do mínimo" variant="warning" />
                  ) : (
                    <StatusBadge label="Normal" variant="success" />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTable>
  );
}
