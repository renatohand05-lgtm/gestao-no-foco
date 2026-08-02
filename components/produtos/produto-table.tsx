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
import {
  formatServiceMargin,
  formatTempoEstimado,
} from "@/lib/produtos/service-commercial";
import type { ProdutoListItem } from "@/types/produtos";

type ProdutoTableProps = {
  tenantSlug: string;
  produtos: ProdutoListItem[];
  /** Quando true, colunas comerciais de serviço (sem estoque). */
  servicosMode?: boolean;
};

export function ProdutoTable({
  tenantSlug,
  produtos,
  servicosMode = false,
}: ProdutoTableProps) {
  const isServicos =
    servicosMode ||
    (produtos.length > 0 && produtos.every((p) => p.tipo === "servico"));

  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isServicos ? "Serviço" : "Item"}</TableHead>
            <TableHead className="hidden md:table-cell">Código</TableHead>
            <TableHead className="hidden lg:table-cell">Categoria</TableHead>
            {isServicos ? (
              <>
                <TableHead className="hidden sm:table-cell">Custo MO</TableHead>
                <TableHead className="hidden sm:table-cell">Preço atual</TableHead>
                <TableHead className="hidden md:table-cell">
                  Preço sugerido
                </TableHead>
                <TableHead className="hidden lg:table-cell">Margem</TableHead>
                <TableHead className="hidden xl:table-cell">Tempo</TableHead>
                <TableHead className="hidden xl:table-cell">Unidade</TableHead>
              </>
            ) : (
              <>
                <TableHead className="hidden sm:table-cell">Preço</TableHead>
                <TableHead className="hidden sm:table-cell">Estoque</TableHead>
              </>
            )}
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
              {isServicos ? (
                <>
                  <TableCell className="hidden sm:table-cell tabular-nums">
                    {formatCurrency(produto.custo)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums">
                    {formatCurrency(produto.preco_venda)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">
                    {formatCurrency(produto.preco_sugerido)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatServiceMargin(produto.custo, produto.preco_venda)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {formatTempoEstimado(produto.tempo_estimado_minutos)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {produto.unidade_cobranca ||
                      produto.unidade_medida ||
                      "—"}
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="hidden sm:table-cell tabular-nums">
                    {formatCurrency(produto.preco_venda)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {produto.tipo === "servico"
                      ? "—"
                      : formatQuantity(
                          produto.estoque_atual,
                          produto.unidade_medida,
                        )}
                  </TableCell>
                </>
              )}
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
