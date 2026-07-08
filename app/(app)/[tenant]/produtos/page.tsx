import { Suspense } from "react";

import { ModuleHeader } from "@/components/layout/module-header";
import { ProdutoEmptyState } from "@/components/produtos/produto-empty-state";
import { ProdutoFeedback } from "@/components/produtos/produto-feedback";
import { ProdutoFilters } from "@/components/produtos/produto-filters";
import { ProdutoPagination } from "@/components/produtos/produto-pagination";
import { ProdutoSearch } from "@/components/produtos/produto-search";
import { ProdutoSort } from "@/components/produtos/produto-sort";
import { ProdutoTable } from "@/components/produtos/produto-table";
import { ActionButton } from "@/components/ui/action-button";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { PRODUTOS_DEFAULT_PER_PAGE } from "@/lib/produtos/constants";
import { createProdutoService } from "@/lib/produtos/produto-service";
import { requireTenant } from "@/lib/tenants";
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
    success?: string;
    error?: string;
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
  const { q, page, sort, order, tipo, ativo, categoria, success, error } =
    await searchParams;
  const tenant = await requireTenant(tenantSlug);
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
  });

  const hasFilters =
    Boolean(q) ||
    tipoFilter !== "all" ||
    ativoFilter !== "all" ||
    Boolean(categoria);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Produtos & Serviços"
        description={`Catálogo e estoque de ${tenant.name}`}
        breadcrumbs={[{ label: "Produtos & Serviços" }]}
      >
        <ActionButton
          action="create"
          label="Novo item"
          href={`/${tenantSlug}/produtos/novo`}
        />
      </ModuleHeader>

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
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {result.total} item{result.total === 1 ? "" : "s"} encontrado
            {result.total === 1 ? "" : "s"}
          </p>
          <ProdutoTable tenantSlug={tenantSlug} produtos={result.data} />
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
