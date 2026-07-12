import { Suspense } from "react";
import { ArrowLeftRight } from "lucide-react";

import { FluxoCaixaDailyChart } from "@/components/financeiro/fluxo-caixa-daily-chart";
import { FluxoCaixaFilters } from "@/components/financeiro/fluxo-caixa-filters";
import { FluxoCaixaMovimentacoesTable } from "@/components/financeiro/fluxo-caixa-movimentacoes-table";
import { FluxoCaixaSummaryCards } from "@/components/financeiro/fluxo-caixa-summary-cards";
import { FinanceiroEmptyState } from "@/components/financeiro/financeiro-empty-state";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
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
  }>;
};

function FiltersFallback() {
  return <SkeletonCard lines={2} />;
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
  } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const defaults = defaultFluxoCaixaPeriodo();
  const status = resolveStatus(statusParam);

  const filters = {
    contaBancariaId: conta || undefined,
    categoriaId: categoria || undefined,
    centroCustoId: centroCusto || undefined,
    status,
    dataDe: dataDe ?? defaults.dataDe,
    dataAte: dataAte ?? defaults.dataAte,
  };

  const service = await createFluxoCaixaService(tenant.id);
  const { resumo, daily, itens, filterOptions } =
    await service.getFluxo(filters);

  const hasFilters =
    Boolean(conta) ||
    Boolean(categoria) ||
    Boolean(centroCusto) ||
    Boolean(statusParam) ||
    Boolean(dataDe) ||
    Boolean(dataAte);

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
        {itens.length === 0 ? (
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
              {itens.length} lançamento{itens.length === 1 ? "" : "s"} encontrado
              {itens.length === 1 ? "" : "s"}
            </p>
            <FluxoCaixaMovimentacoesTable items={itens} />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
