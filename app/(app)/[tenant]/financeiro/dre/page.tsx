import { Suspense } from "react";

import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { DreDrillPanel } from "@/components/financeiro/dre-drill-panel";
import { DreFilters } from "@/components/financeiro/dre-filters";
import { DreGapsPanel } from "@/components/financeiro/dre-gaps-panel";
import { DreStatement } from "@/components/financeiro/dre-statement";
import { DreSummaryCards } from "@/components/financeiro/dre-summary-cards";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import {
  createDreService,
  defaultDrePeriodo,
} from "@/lib/financeiro/dre-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import { ExecutivePage } from "@/components/executive";

export const metadata = { title: "DRE Enterprise" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    centroCusto?: string;
    categoria?: string;
    planoConta?: string;
    dataDe?: string;
    dataAte?: string;
    linha?: string;
    detalhe?: string;
  }>;
};

function FiltersFallback() {
  return <SkeletonCard lines={2} />;
}

export default async function DreEnterprisePage({
  params,
  searchParams,
}: PageProps) {
  const { tenant: tenantSlug } = await params;
  const {
    centroCusto,
    categoria,
    planoConta,
    dataDe,
    dataAte,
    linha,
    detalhe,
  } = await searchParams;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.ver_dre",
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="DRE"
          description="Demonstração do Resultado por competência."
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

  const defaults = defaultDrePeriodo();
  const filters = {
    centroCustoId: centroCusto || undefined,
    categoriaId: categoria || undefined,
    planoContaId: planoConta || undefined,
    dataDe: dataDe ?? defaults.dataDe,
    dataAte: dataAte ?? defaults.dataAte,
  };

  const service = await createDreService(auth.tenant.id);
  const { resumo, linhas, gaps, filterOptions, drillItems } =
    await service.getDre(filters);

  const drill =
    linha && drillItems
      ? drillItems.filter((item) => {
          if (item.linha !== linha) return false;
          if (!detalhe) return true;
          if (detalhe === "__none__") return !item.detalhe;
          return item.detalhe === detalhe;
        })
      : [];

  return (
    <ExecutivePage width="wide" spacing="loose">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={auth.tenant.name}
        title="DRE"
        description="Demonstração do Resultado por competência. Pagamentos alimentam o Fluxo de Caixa."
      />

      <DreSummaryCards resumo={resumo} />

      <Suspense fallback={<FiltersFallback />}>
        <DreFilters
          tenantSlug={tenantSlug}
          centrosCusto={filterOptions.centrosCusto}
          categorias={filterOptions.categorias}
          planosConta={filterOptions.planosConta}
          currentCentroCustoId={centroCusto ?? ""}
          currentCategoriaId={categoria ?? ""}
          currentPlanoContaId={planoConta ?? ""}
          dataDe={filters.dataDe}
          dataAte={filters.dataAte}
        />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <DreStatement
          linhas={linhas}
          tenantSlug={tenantSlug}
          query={{
            dataDe: filters.dataDe,
            dataAte: filters.dataAte,
            centroCusto,
            categoria,
            planoConta,
            linha,
            detalhe,
          }}
        />
        <div className="space-y-6">
          {linha ? (
            <DreDrillPanel
              tenantSlug={tenantSlug}
              linha={linha}
              detalhe={detalhe}
              items={drill}
            />
          ) : null}
          <DreGapsPanel tenantSlug={tenantSlug} gaps={gaps} />
        </div>
      </div>
    </ExecutivePage>
  );
}
