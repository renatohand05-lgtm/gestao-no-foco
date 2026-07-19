import { Suspense } from "react";
import { Target } from "lucide-react";

import { CentroCustoTable } from "@/components/financeiro/centro-custo-table";
import { FinanceiroEmptyState } from "@/components/financeiro/financeiro-empty-state";
import { FinanceiroFeedback } from "@/components/financeiro/financeiro-feedback";
import { FinanceiroFilters } from "@/components/financeiro/financeiro-filters";
import { FinanceiroPagination } from "@/components/financeiro/financeiro-pagination";
import { FinanceiroSearch } from "@/components/financeiro/financeiro-search";
import { FinanceiroSort } from "@/components/financeiro/financeiro-sort";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import {
  FINANCEIRO_DEFAULT_PER_PAGE,
  CENTRO_CUSTO_SORT_OPTIONS,
} from "@/lib/financeiro/constants";
import { createCentroCustoService } from "@/lib/financeiro/centro-custo-service";
import { requireTenant } from "@/lib/tenants";
import type {
  FinanceiroSuccessMessage,
  SortOrder,
  CentroCustoSortField,
} from "@/types/financeiro";

export const metadata = { title: "Centros de Custo" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    order?: string;
    ativo?: string;
    success?: string;
    error?: string;
  }>;
};

function ToolbarFallback() {
  return <SkeletonCard lines={2} />;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const { q, page, sort, order, ativo, success, error } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createCentroCustoService(tenant.id);

  const currentPage = Number(page) > 0 ? Number(page) : 1;
  const sortField = (sort as CentroCustoSortField | undefined) ?? "codigo";
  const sortOrder = (order as SortOrder | undefined) ?? "asc";
  const ativoFilter =
    ativo === "true" ? true : ativo === "false" ? false : "all";

  const result = await service.list({
    search: q,
    page: currentPage,
    perPage: FINANCEIRO_DEFAULT_PER_PAGE,
    sort: sortField,
    order: sortOrder,
    ativo: ativoFilter,
    
  });

  const hasFilters =
    Boolean(q) ||
    ativoFilter !== "all";

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Centros de Custo"
        description={`Estrutura financeira de ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Centros de Custo" },
        ]}
      >
        <ActionButton
          action="create"
          label="Novo centro"
          href={`/${tenantSlug}/financeiro/centros-custo/novo`}
        />
      </ModuleHeader>

      <FinanceiroFeedback
        success={success as FinanceiroSuccessMessage | undefined}
        error={error}
      />

      <Suspense fallback={<ToolbarFallback />}>
        <div className="space-y-4">
          <DataTableToolbar>
            <FinanceiroSearch
              tenantSlug={tenantSlug}
              basePath="centros-custo"
              defaultValue={q ?? ""}
              placeholder="Buscar por código, nome ou responsável"
            />
          </DataTableToolbar>
          <FinanceiroFilters
            tenantSlug={tenantSlug}
            basePath="centros-custo"
            currentAtivo={ativo === "true" || ativo === "false" ? ativo : "all"}
            
            
          />
          <FinanceiroSort
            tenantSlug={tenantSlug}
            basePath="centros-custo"
            options={CENTRO_CUSTO_SORT_OPTIONS}
            currentSort={sortField}
            currentOrder={sortOrder}
          />
        </div>
      </Suspense>

      {result.data.length === 0 ? (
        <FinanceiroEmptyState
          tenantSlug={tenantSlug}
          basePath="centros-custo"
          icon={Target}
          title="Nenhum centro de custo cadastrado"
          description="Cadastre centros para alocar despesas e receitas por área."
          impact="Centros de custo organizam filtros e análises do Dashboard."
          createLabel="Novo centro"
          hasSearch={Boolean(q)}
          hasFilters={hasFilters}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {result.total} registro{result.total === 1 ? "" : "s"} encontrado
            {result.total === 1 ? "" : "s"}
          </p>
          <CentroCustoTable tenantSlug={tenantSlug} items={result.data} />
          <Suspense fallback={null}>
            <FinanceiroPagination
              tenantSlug={tenantSlug}
              basePath="centros-custo"
              page={result.page}
              totalPages={result.totalPages}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
