import { Suspense } from "react";
import { ArrowLeftRight } from "lucide-react";

import { FluxoCaixaDailyChart } from "@/components/financeiro/fluxo-caixa-daily-chart";
import { FluxoCaixaFilters } from "@/components/financeiro/fluxo-caixa-filters";
import { FluxoCaixaMovimentacoesTable } from "@/components/financeiro/fluxo-caixa-movimentacoes-table";
import { FluxoCaixaSummaryCards } from "@/components/financeiro/fluxo-caixa-summary-cards";
import { FinanceiroEmptyState } from "@/components/financeiro/financeiro-empty-state";
import { FinanceiroPagination } from "@/components/financeiro/financeiro-pagination";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { FINANCEIRO_DEFAULT_PER_PAGE } from "@/lib/financeiro/constants";
import {
  createFluxoCaixaService,
  defaultFluxoCaixaPeriodo,
} from "@/lib/financeiro/fluxo-caixa-service";
import { requireTenant } from "@/lib/tenants";
import type { FluxoCaixaStatusFilter } from "@/types/fluxo-caixa";

export const metadata = { title: "Fluxo de Caixa" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    conta?: string;
    categoria?: string;
    centroCusto?: string;
    status?: string;
    dataDe?: string;
    dataAte?: string;
    page?: string;
  }>;
};

function FiltersFallback() {
  return <SkeletonCard lines={2} />;
}

function TableFallback() {
  return <SkeletonCard lines={6} />;
}

function resolveStatus(status?: string): FluxoCaixaStatusFilter {
  if (status === "realizado" || status === "previsto") return status;
  return "all";
}

export default async function Page({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const {
    conta,
    categoria,
    centroCusto,
    status: statusParam,
    dataDe,
    dataAte,
    page: pageParam,
  } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const defaults = defaultFluxoCaixaPeriodo();
  const status = resolveStatus(statusParam);
  const currentPage = Number(pageParam) > 0 ? Number(pageParam) : 1;

  const filters = {
    contaBancariaId: conta || undefined,
    categoriaId: categoria || undefined,
    centroCustoId: centroCusto || undefined,
    status,
    dataDe: dataDe ?? defaults.dataDe,
    dataAte: dataAte ?? defaults.dataAte,
    page: currentPage,
    perPage: FINANCEIRO_DEFAULT_PER_PAGE,
  };

  const hasFilters =
    Boolean(conta) ||
    Boolean(categoria) ||
    Boolean(centroCusto) ||
    Boolean(statusParam) ||
    Boolean(dataDe) ||
    Boolean(dataAte);

  let resumo;
  let daily;
  let itens;
  let filterOptions;
  let loadError: string | null = null;

  try {
    const service = await createFluxoCaixaService(tenant.id);
    const result = await service.getFluxo(filters);
    resumo = result.resumo;
    daily = result.daily;
    itens = result.itens;
    filterOptions = result.filterOptions;
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar o Fluxo de Caixa.";
  }

  if (loadError || !resumo || !daily || !itens || !filterOptions) {
    return (
      <div className="space-y-6">
        <ModuleHeader
          title="Fluxo de Caixa"
          description={`Movimentações e projeção financeira de ${tenant.name}`}
          breadcrumbs={[
            { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
            { label: "Fluxo de Caixa" },
          ]}
        />
        <FinanceiroEmptyState
          tenantSlug={tenantSlug}
          basePath="fluxo-caixa"
          icon={ArrowLeftRight}
          title="Não foi possível carregar o Fluxo de Caixa"
          description={loadError ?? "Tente novamente em instantes."}
          hasSearch={false}
          hasFilters={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Fluxo de Caixa"
        description={`Movimentações e projeção financeira de ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Fluxo de Caixa" },
        ]}
      />

      <FluxoCaixaSummaryCards resumo={resumo} />

      <Suspense fallback={<FiltersFallback />}>
        <FluxoCaixaFilters
          tenantSlug={tenantSlug}
          contas={filterOptions.contas}
          categorias={filterOptions.categorias}
          centrosCusto={filterOptions.centrosCusto}
          currentContaId={conta ?? ""}
          currentCategoriaId={categoria ?? ""}
          currentCentroCustoId={centroCusto ?? ""}
          currentStatus={status}
          dataDe={filters.dataDe}
          dataAte={filters.dataAte}
        />
      </Suspense>

      <FluxoCaixaDailyChart data={daily} />

      <SectionCard
        title="Movimentações"
        description="Lançamentos realizados e títulos previstos no período"
      >
        {itens.total === 0 ? (
          <FinanceiroEmptyState
            tenantSlug={tenantSlug}
            basePath="fluxo-caixa"
            icon={ArrowLeftRight}
            title="Nenhuma movimentação encontrada"
            description="Ajuste os filtros ou aguarde novos lançamentos a partir de baixas e movimentações bancárias."
            hasSearch={false}
            hasFilters={hasFilters}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {itens.total} lançamento{itens.total === 1 ? "" : "s"} encontrado
              {itens.total === 1 ? "" : "s"}
              {itens.totalPages > 1
                ? ` · página ${itens.page} de ${itens.totalPages}`
                : ""}
            </p>
            <Suspense fallback={<TableFallback />}>
              <FluxoCaixaMovimentacoesTable items={itens.data} />
            </Suspense>
            {itens.totalPages > 1 ? (
              <FinanceiroPagination
                tenantSlug={tenantSlug}
                basePath="fluxo-caixa"
                page={itens.page}
                totalPages={itens.totalPages}
              />
            ) : null}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
