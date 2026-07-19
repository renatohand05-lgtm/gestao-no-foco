import { Suspense } from "react";

import { DreDrillPanel } from "@/components/financeiro/dre-drill-panel";
import { DreFilters } from "@/components/financeiro/dre-filters";
import { DreGapsPanel } from "@/components/financeiro/dre-gaps-panel";
import { DreStatement } from "@/components/financeiro/dre-statement";
import { DreSummaryCards } from "@/components/financeiro/dre-summary-cards";
import { ModuleHeader } from "@/components/layout/module-header";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import {
  createDreService,
  defaultDrePeriodo,
} from "@/lib/financeiro/dre-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "DRE" };

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

export default async function Page({ params, searchParams }: PageProps) {
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
  const tenant = await requireTenant(tenantSlug);
  const defaults = defaultDrePeriodo();

  const filters = {
    centroCustoId: centroCusto || undefined,
    categoriaId: categoria || undefined,
    planoContaId: planoConta || undefined,
    dataDe: dataDe ?? defaults.dataDe,
    dataAte: dataAte ?? defaults.dataAte,
  };

  const service = await createDreService(tenant.id);
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
    <div className="space-y-6">
      <ModuleHeader
        title="DRE"
        description={`Demonstração do Resultado por competência — ${tenant.name}. Pagamentos alimentam o Fluxo de Caixa, não geram nova despesa aqui.`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "DRE" },
        ]}
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
    </div>
  );
}
