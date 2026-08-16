import { Suspense } from "react";

import { ModuleHeader } from "@/components/layout/module-header";
import { ProdutoEmptyState } from "@/components/produtos/produto-empty-state";
import { ProdutoFeedback } from "@/components/produtos/produto-feedback";
import { ProdutoFilters } from "@/components/produtos/produto-filters";
import { ProdutoHubTabs } from "@/components/produtos/produto-hub-tabs";
import { ProdutoPagination } from "@/components/produtos/produto-pagination";
import { ProdutoSearch } from "@/components/produtos/produto-search";
import { ProdutoSort } from "@/components/produtos/produto-sort";
import { ProdutoTable } from "@/components/produtos/produto-table";
import { ActionButton } from "@/components/ui/action-button";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { PRODUTOS_DEFAULT_PER_PAGE } from "@/lib/produtos/constants";
import { createProdutoService } from "@/lib/produtos/produto-service";
import { requireTenant } from "@/lib/tenants";
import { buildCatalogPickerView } from "@/lib/segments/catalogs/view-model.ts";
import { resolveSegmentContext } from "@/lib/segments/resolve.ts";
import type {
  ProdutoSortField,
  ProdutoSuccessMessage,
  ProdutoTipo,
  SortOrder,
} from "@/types/produtos";

export const metadata = { title: "Produtos & Serviços" };

type ProdutosPageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    order?: string;
    tipo?: string;
    ativo?: string;
    categoria?: string;
    custoZerado?: string;
    precoZerado?: string;
    success?: string;
    error?: string;
    library?: string;
    added?: string;
    skipped?: string;
  }>;
};

function ToolbarFallback() {
  return <SkeletonCard lines={2} />;
}

export default async function ProdutosPage({
  params,
  searchParams,
}: ProdutosPageProps) {
  const { tenant: tenantSlug } = await params;
  const {
    q,
    page,
    sort,
    order,
    tipo,
    ativo,
    categoria,
    custoZerado,
    precoZerado,
    success,
    error,
    library,
    added,
    skipped,
  } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const catalogView = buildCatalogPickerView(
    resolveSegmentContext({
      segment: tenant.segment,
      segmentVersion: tenant.segment_version,
      segmentConfig: tenant.segment_config,
    }),
  );
  const service = await createProdutoService(tenant.id);

  const currentPage = Number(page) > 0 ? Number(page) : 1;
  const sortField = (sort as ProdutoSortField | undefined) ?? "nome";
  const sortOrder = (order as SortOrder | undefined) ?? "asc";
  const tipoFilter = (tipo as ProdutoTipo | "all" | undefined) ?? "all";
  const ativoFilter =
    ativo === "true" ? true : ativo === "false" ? false : "all";

  const result = await service.list({
    search: q,
    page: currentPage,
    perPage: PRODUTOS_DEFAULT_PER_PAGE,
    sort: sortField,
    order: sortOrder,
    tipo: tipoFilter,
    ativo: ativoFilter,
    categoria,
    custoZerado: custoZerado === "1",
    precoZerado: precoZerado === "1",
  });

  const hasFilters =
    Boolean(q) ||
    tipoFilter !== "all" ||
    ativoFilter !== "all" ||
    Boolean(categoria) ||
    custoZerado === "1" ||
    precoZerado === "1";

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Produtos & Serviços"
        description={`Catálogo separado por tipo em ${tenant.name}`}
        breadcrumbs={[{ label: "Produtos & Serviços" }]}
      >
        {catalogView.hasLibrary ? (
          <ActionButton
            action="view"
            label={
              !hasFilters && result.total === 0
                ? "Montar catálogo inicial"
                : "Sugestões do segmento"
            }
            href={`/${tenantSlug}/produtos/catalogo-inicial`}
          />
        ) : null}
        <ActionButton
          action="create"
          label="Importar produtos"
          href={`/${tenantSlug}/produtos/importar?kind=produtos`}
        />
        <ActionButton
          action="create"
          label="Importar serviços"
          href={`/${tenantSlug}/produtos/importar?kind=servicos`}
        />
        <ActionButton
          action="create"
          label="Novo produto"
          href={`/${tenantSlug}/produtos/novo?tipo=produto`}
        />
        <ActionButton
          action="create"
          label="Novo serviço"
          href={`/${tenantSlug}/produtos/novo?tipo=servico`}
        />
        <ActionButton
          action="view"
          label="Gerenciar serviços"
          href={`/${tenantSlug}/produtos/gerenciar-servicos`}
        />
      </ModuleHeader>

      <ProdutoHubTabs tenantSlug={tenantSlug} currentTipo={tipoFilter} />

      {library === "1" ? (
        <FeedbackMessage variant="success">
          {Number(added) > 0
            ? `${added} adicionado${Number(added) === 1 ? "" : "s"}.`
            : "Nenhum item novo foi cadastrado."}
          {Number(skipped) > 0
            ? ` ${skipped} já existiam e foram ignorados.`
            : ""}
          {Number(added) > 0 ? (
            <>
              {" "}
              <a
                className="font-medium underline underline-offset-2"
                href={`/${tenantSlug}/produtos?precoZerado=1`}
              >
                Definir preços
              </a>
            </>
          ) : null}
        </FeedbackMessage>
      ) : null}

      <ProdutoFeedback
        success={success as ProdutoSuccessMessage | undefined}
        error={error}
      />

      <Suspense fallback={<ToolbarFallback />}>
        <div className="space-y-4">
          <DataTableToolbar>
            <ProdutoSearch tenantSlug={tenantSlug} defaultValue={q ?? ""} />
          </DataTableToolbar>
          <ProdutoFilters
            tenantSlug={tenantSlug}
            currentTipo={tipoFilter}
            currentAtivo={ativo === "true" || ativo === "false" ? ativo : "all"}
            currentCategoria={categoria ?? ""}
            currentCustoZerado={custoZerado === "1"}
            currentPrecoZerado={precoZerado === "1"}
          />
          <ProdutoSort
            tenantSlug={tenantSlug}
            currentSort={sortField}
            currentOrder={sortOrder}
          />
        </div>
      </Suspense>

      {result.data.length === 0 ? (
        <ProdutoEmptyState
          tenantSlug={tenantSlug}
          hasSearch={Boolean(q)}
          hasFilters={hasFilters}
          hasLibrary={catalogView.hasLibrary}
          title={catalogView.emptyCatalogTitle}
          description={`${catalogView.emptyCatalogBody} ${catalogView.description}`}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {result.total} item{result.total === 1 ? "" : "s"} encontrado
            {result.total === 1 ? "" : "s"}
          </p>
          <ProdutoTable
            tenantSlug={tenantSlug}
            produtos={result.data}
            servicosMode={tipoFilter === "servico"}
          />
          <ProdutoPagination
            tenantSlug={tenantSlug}
            page={result.page}
            totalPages={result.totalPages}
          />
        </>
      )}
    </div>
  );
}
