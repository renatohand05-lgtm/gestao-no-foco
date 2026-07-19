import { Suspense } from "react";
import { Landmark } from "lucide-react";

import { ContaBancariaTable } from "@/components/financeiro/conta-bancaria-table";
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
  CONTA_BANCARIA_SORT_OPTIONS,
  CONTA_BANCARIA_TIPO_FILTER_OPTIONS,
} from "@/lib/financeiro/constants";
import { createContaBancariaService } from "@/lib/financeiro/conta-bancaria-service";
import { requireTenant } from "@/lib/tenants";
import type {
  FinanceiroSuccessMessage,
  SortOrder,
  ContaBancariaSortField,
} from "@/types/financeiro";

export const metadata = { title: "Contas Bancárias" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    order?: string;
    ativo?: string;
    tipo?: string;
    success?: string;
    error?: string;
  }>;
};

function ToolbarFallback() {
  return <SkeletonCard lines={2} />;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const { q, page, sort, order, ativo, tipo, success, error } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createContaBancariaService(tenant.id);

  const currentPage = Number(page) > 0 ? Number(page) : 1;
  const sortField = (sort as ContaBancariaSortField | undefined) ?? "nome";
  const sortOrder = (order as SortOrder | undefined) ?? "asc";
  const ativoFilter =
    ativo === "true" ? true : ativo === "false" ? false : "all";
  const tipoFilter = (tipo as string | undefined) ?? "all";

  const result = await service.list({
    search: q,
    page: currentPage,
    perPage: FINANCEIRO_DEFAULT_PER_PAGE,
    sort: sortField,
    order: sortOrder,
    ativo: ativoFilter,
    tipo: tipoFilter as never,
  });

  const hasFilters =
    Boolean(q) ||
    ativoFilter !== "all" ||
    tipoFilter !== "all";

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Contas Bancárias"
        description={`Estrutura financeira de ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Contas Bancárias" },
        ]}
      >
        <ActionButton
          action="create"
          label="Nova conta"
          href={`/${tenantSlug}/financeiro/contas-bancarias/novo`}
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
              basePath="contas-bancarias"
              defaultValue={q ?? ""}
              placeholder="Buscar por nome, banco, agência ou conta"
            />
          </DataTableToolbar>
          <FinanceiroFilters
            tenantSlug={tenantSlug}
            basePath="contas-bancarias"
            currentAtivo={ativo === "true" || ativo === "false" ? ativo : "all"}
            tipoOptions={CONTA_BANCARIA_TIPO_FILTER_OPTIONS}
            currentTipo={tipoFilter}
            
          />
          <FinanceiroSort
            tenantSlug={tenantSlug}
            basePath="contas-bancarias"
            options={CONTA_BANCARIA_SORT_OPTIONS}
            currentSort={sortField}
            currentOrder={sortOrder}
          />
        </div>
      </Suspense>

      {result.data.length === 0 ? (
        <FinanceiroEmptyState
          tenantSlug={tenantSlug}
          basePath="contas-bancarias"
          icon={Landmark}
          title="Nenhuma conta bancária cadastrada"
          description="Cadastre bancos e caixas para acompanhar saldos e fluxo."
          impact="Contas bancárias liberam leituras financeiras no Dashboard."
          createLabel="Nova conta"
          hasSearch={Boolean(q)}
          hasFilters={hasFilters}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {result.total} registro{result.total === 1 ? "" : "s"} encontrado
            {result.total === 1 ? "" : "s"}
          </p>
          <ContaBancariaTable tenantSlug={tenantSlug} items={result.data} />
          <Suspense fallback={null}>
            <FinanceiroPagination
              tenantSlug={tenantSlug}
              basePath="contas-bancarias"
              page={result.page}
              totalPages={result.totalPages}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
