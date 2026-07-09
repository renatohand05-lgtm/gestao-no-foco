import { Suspense } from "react";
import { BookOpen } from "lucide-react";

import { PlanoContaTable } from "@/components/financeiro/plano-conta-table";
import { PlanoContaTree } from "@/components/financeiro/plano-conta-tree";
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
  PLANO_CONTA_SORT_OPTIONS,
  PLANO_CONTA_TIPO_FILTER_OPTIONS,
  PLANO_CONTA_NATUREZA_FILTER_OPTIONS,
} from "@/lib/financeiro/constants";
import { buildPlanoContaTree } from "@/lib/financeiro/plano-conta-tree";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
import { requireTenant } from "@/lib/tenants";
import type {
  FinanceiroSuccessMessage,
  SortOrder,
  PlanoContaSortField,
} from "@/types/financeiro";

export const metadata = { title: "Plano de Contas" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    order?: string;
    ativo?: string;
    tipo?: string;
    natureza?: string;
    success?: string;
    error?: string;
  }>;
};

function ToolbarFallback() {
  return <SkeletonCard lines={2} />;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const { q, page, sort, order, ativo, tipo, natureza, success, error } =
    await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createPlanoContaService(tenant.id);

  const currentPage = Number(page) > 0 ? Number(page) : 1;
  const sortField = (sort as PlanoContaSortField | undefined) ?? "codigo";
  const sortOrder = (order as SortOrder | undefined) ?? "asc";
  const ativoFilter =
    ativo === "true" ? true : ativo === "false" ? false : "all";
  const tipoFilter = (tipo as string | undefined) ?? "all";
  const naturezaFilter = (natureza as string | undefined) ?? "all";

  const hasSearch = Boolean(q?.trim());
  const hasFilters =
    hasSearch ||
    ativoFilter !== "all" ||
    tipoFilter !== "all" ||
    naturezaFilter !== "all";
  const treeMode = !hasSearch;

  const [treeItems, flatResult] = await Promise.all([
    treeMode
      ? service.listForTree({
          ativo: ativoFilter,
          tipo: tipoFilter as never,
          natureza: naturezaFilter as never,
        })
      : Promise.resolve([]),
    hasSearch
      ? service.list({
          search: q,
          page: currentPage,
          perPage: FINANCEIRO_DEFAULT_PER_PAGE,
          sort: sortField,
          order: sortOrder,
          ativo: ativoFilter,
          tipo: tipoFilter as never,
          natureza: naturezaFilter as never,
        })
      : Promise.resolve(null),
  ]);

  const treeNodes = treeMode ? buildPlanoContaTree(treeItems) : [];
  const totalCount = treeMode ? treeItems.length : (flatResult?.total ?? 0);
  const isEmpty = totalCount === 0;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Plano de Contas"
        description={`Estrutura hierárquica de ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Plano de Contas" },
        ]}
      >
        <ActionButton
          action="create"
          label="Nova conta"
          href={`/${tenantSlug}/financeiro/plano-contas/novo`}
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
              basePath="plano-contas"
              defaultValue={q ?? ""}
              placeholder="Buscar por código ou nome"
            />
          </DataTableToolbar>
          <FinanceiroFilters
            tenantSlug={tenantSlug}
            basePath="plano-contas"
            currentAtivo={ativo === "true" || ativo === "false" ? ativo : "all"}
            tipoOptions={PLANO_CONTA_TIPO_FILTER_OPTIONS}
            currentTipo={tipoFilter}
            naturezaOptions={PLANO_CONTA_NATUREZA_FILTER_OPTIONS}
            currentNatureza={naturezaFilter}
          />
          {hasSearch ? (
            <FinanceiroSort
              tenantSlug={tenantSlug}
              basePath="plano-contas"
              options={PLANO_CONTA_SORT_OPTIONS}
              currentSort={sortField}
              currentOrder={sortOrder}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Visualização em árvore por código. Use a busca para localizar contas
              específicas com resultados em lista.
            </p>
          )}
        </div>
      </Suspense>

      {isEmpty ? (
        <FinanceiroEmptyState
          tenantSlug={tenantSlug}
          basePath="plano-contas"
          icon={BookOpen}
          title="Nenhuma conta cadastrada"
          description="Monte o plano de contas para classificar lançamentos futuros."
          createLabel="Nova conta"
          hasSearch={hasSearch}
          hasFilters={hasFilters}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {totalCount} conta{totalCount === 1 ? "" : "s"}
            {treeMode ? " na estrutura hierárquica" : " encontrada(s)"}
          </p>
          {treeMode ? (
            <PlanoContaTree tenantSlug={tenantSlug} nodes={treeNodes} />
          ) : (
            <>
              <PlanoContaTable
                tenantSlug={tenantSlug}
                items={flatResult!.data}
              />
              <Suspense fallback={null}>
                <FinanceiroPagination
                  tenantSlug={tenantSlug}
                  basePath="plano-contas"
                  page={flatResult!.page}
                  totalPages={flatResult!.totalPages}
                />
              </Suspense>
            </>
          )}
        </>
      )}
    </div>
  );
}
