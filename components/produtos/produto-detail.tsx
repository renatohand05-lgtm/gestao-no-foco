import { ModuleHeader } from "@/components/layout/module-header";
import { ProdutoDeleteButton } from "@/components/produtos/produto-delete-button";
import { ProdutoStatusBadge } from "@/components/produtos/produto-status-badge";
import { ProdutoTipoBadge } from "@/components/produtos/produto-tipo-badge";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import { PRODUTO_TIPOS_COM_ESTOQUE } from "@/lib/produtos/constants";
import {
  formatCurrency,
  formatPercent,
  formatProdutoDate,
  formatQuantity,
} from "@/lib/produtos/format";
import type { Produto } from "@/types/produtos";

type ProdutoDetailProps = {
  tenantSlug: string;
  produto: Produto;
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export function ProdutoDetail({ tenantSlug, produto }: ProdutoDetailProps) {
  const showEstoque = PRODUTO_TIPOS_COM_ESTOQUE.includes(
    produto.tipo as (typeof PRODUTO_TIPOS_COM_ESTOQUE)[number],
  );

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={produto.nome}
        description="Detalhes do item"
        breadcrumbs={[
          { label: "Produtos & Serviços", href: `/${tenantSlug}/produtos` },
          { label: produto.nome },
        ]}
      >
        <ProdutoTipoBadge tipo={produto.tipo} />
        <ProdutoStatusBadge ativo={produto.ativo} />
        <ActionButton
          action="edit"
          href={`/${tenantSlug}/produtos/${produto.id}/editar`}
        />
        <ProdutoDeleteButton
          tenantSlug={tenantSlug}
          produtoId={produto.id}
          produtoNome={produto.nome}
        />
      </ModuleHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Identificação">
          <FormGrid>
            <DetailItem label="Código interno" value={produto.codigo_interno || "—"} />
            <DetailItem label="SKU" value={produto.sku || "—"} />
            <DetailItem label="Código de barras" value={produto.codigo_barras || "—"} />
            <DetailItem label="Unidade" value={produto.unidade_medida} />
          </FormGrid>
        </SectionCard>

        <SectionCard title="Classificação">
          <FormGrid>
            <DetailItem label="Categoria" value={produto.categoria || "—"} />
            <DetailItem label="Subcategoria" value={produto.subcategoria || "—"} />
            <DetailItem label="Marca" value={produto.marca || "—"} />
            <DetailItem
              label="Fornecedor principal"
              value={produto.fornecedor_principal || "—"}
            />
          </FormGrid>
        </SectionCard>

        <SectionCard title="Precificação">
          <FormGrid>
            <DetailItem label="Custo" value={formatCurrency(produto.custo)} />
            <DetailItem label="Preço de venda" value={formatCurrency(produto.preco_venda)} />
            <DetailItem
              label="Margem"
              value={formatPercent(produto.margem_percent)}
            />
          </FormGrid>
        </SectionCard>

        {showEstoque ? (
          <SectionCard title="Estoque">
            <FormGrid>
              <DetailItem
                label="Estoque atual"
                value={formatQuantity(produto.estoque_atual, produto.unidade_medida)}
              />
              <DetailItem
                label="Estoque mínimo"
                value={formatQuantity(produto.estoque_minimo, produto.unidade_medida)}
              />
              <DetailItem
                label="Estoque máximo"
                value={formatQuantity(produto.estoque_maximo, produto.unidade_medida)}
              />
              <DetailItem label="Localização" value={produto.localizacao || "—"} />
            </FormGrid>
          </SectionCard>
        ) : null}

        <SectionCard title="Observações" className="lg:col-span-2">
          <p className="text-sm text-muted-foreground">
            {produto.observacoes || "Nenhuma observação registrada."}
          </p>
          <FormGrid className="mt-4 border-t pt-4">
            <DetailItem
              label="Cadastrado em"
              value={formatProdutoDate(produto.created_at)}
            />
            <DetailItem
              label="Atualizado em"
              value={formatProdutoDate(produto.updated_at)}
            />
          </FormGrid>
        </SectionCard>
      </div>
    </div>
  );
}
