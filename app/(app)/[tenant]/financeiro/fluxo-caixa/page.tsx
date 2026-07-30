import { Suspense } from "react";
import { ArrowLeftRight } from "lucide-react";

import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { CashflowChart } from "@/components/finance/cashflow-chart";
import { CashflowTable } from "@/components/finance/cashflow-table";
import { FluxoCaixaDailyChart } from "@/components/financeiro/fluxo-caixa-daily-chart";
import { FluxoCaixaFilters } from "@/components/financeiro/fluxo-caixa-filters";
import { FluxoCaixaMovimentacoesTable } from "@/components/financeiro/fluxo-caixa-movimentacoes-table";
import { FluxoCaixaSummaryCards } from "@/components/financeiro/fluxo-caixa-summary-cards";
import { FinanceiroEmptyState } from "@/components/financeiro/financeiro-empty-state";
import { FinanceiroPagination } from "@/components/financeiro/financeiro-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { FINANCEIRO_DEFAULT_PER_PAGE } from "@/lib/financeiro/constants";
import {
  createFluxoCaixaService,
  defaultFluxoCaixaPeriodo,
} from "@/lib/financeiro/fluxo-caixa-service";
import { listCashFlow } from "@/lib/finance/actions";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import type { FluxoCaixaStatusFilter } from "@/types/fluxo-caixa";
import { ExecutivePage } from "@/components/executive";

export const metadata = { title: "Fluxo de Caixa Enterprise" };

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

export default async function FluxoCaixaEnterprisePage({
  params,
  searchParams,
}: PageProps) {
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

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.ver_fluxo_caixa",
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Fluxo de caixa"
          description="Movimentações e projeção financeira."
        />
        <p
          className="rounded-lg border border-amber-600/40 px-3 py-3 text-sm"
          role="alert"
          data-finance-rbac="denied"
        >
          {err.message}
        </p>
      </div>
    );
  }

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

  const coreCashFlow = await listCashFlow(tenantSlug, {
    from: filters.dataDe,
    to: filters.dataAte,
    accountId: conta || undefined,
  });

  let resumo;
  let daily;
  let itens;
  let filterOptions;
  let loadError: string | null = null;

  try {
    const service = await createFluxoCaixaService(auth.tenant.id);
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
      <ExecutivePage width="wide" spacing="loose">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          tenantName={auth.tenant.name}
          title="Fluxo de caixa"
          description="Movimentações e projeção financeira."
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
      </ExecutivePage>
    );
  }

  return (
    <ExecutivePage width="wide" spacing="loose">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={auth.tenant.name}
        title="Fluxo de caixa"
        description="Finance Core + projeção de caixa."
      />

      <FluxoCaixaSummaryCards resumo={resumo} />

      {coreCashFlow.success &&
      !categoria &&
      !centroCusto &&
      status === "all" ? (
        <div className="grid gap-4 lg:grid-cols-2" data-enterprise-cashflow-core>
          <CashflowChart points={coreCashFlow.cashFlow.points} />
          <CashflowTable cashFlow={coreCashFlow.cashFlow} />
        </div>
      ) : null}

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
    </ExecutivePage>
  );
}
