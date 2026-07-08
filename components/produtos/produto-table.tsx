import Link from "next/link";

import { ProdutoRowActions } from "@/components/produtos/produto-row-actions";
import { ProdutoStatusBadge } from "@/components/produtos/produto-status-badge";
import { ProdutoTipoBadge } from "@/components/produtos/produto-tipo-badge";
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
  formatProdutoDate,
  formatQuantity,
} from "@/lib/produtos/format";
import type { ProdutoListItem } from "@/types/produtos";

type ProdutoTableProps = {
  tenantSlug: string;
  produtos: ProdutoListItem[];
};

export function ProdutoTable({ tenantSlug, produtos }: ProdutoTableProps) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="hidden md:table-cell">Código</TableHead>
            <TableHead className="hidden lg:table-cell">Categoria</TableHead>
            <TableHead className="hidden sm:table-cell">Preço</TableHead>
            <TableHead className="hidden sm:table-cell">Estoque</TableHead>
            <TableHead className="hidden xl:table-cell">Status</TableHead>
            <TableHead className="hidden xl:table-cell">Cadastro</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtos.map((produto) => (
            <TableRow key={produto.id}>
              <TableCell>
                <Link
                  href={`/${tenantSlug}/produtos/${produto.id}`}
                  className="block hover:underline"
                >
                  <p className="font-medium">{produto.nome}</p>
                  <div className="mt-1">
                    <ProdutoTipoBadge tipo={produto.tipo} />
                  </div>
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="space-y-1 text-sm">
                  <p>{produto.codigo_interno || produto.sku || "—"}</p>
                  {produto.sku && produto.codigo_interno ? (
                    <p className="text-xs text-muted-foreground">
                      SKU: {produto.sku}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {produto.categoria || "—"}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {formatCurrency(produto.preco_venda)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {produto.tipo === "servico"
                  ? "—"
                  : formatQuantity(produto.estoque_atual, produto.unidade_medida)}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <ProdutoStatusBadge ativo={produto.ativo} />
              </TableCell>
              <TableCell className="hidden xl:table-cell text-muted-foreground">
                {formatProdutoDate(produto.created_at)}
              </TableCell>
              <TableCell>
                <ProdutoRowActions tenantSlug={tenantSlug} produto={produto} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
  );
}
