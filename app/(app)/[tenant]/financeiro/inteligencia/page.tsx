import { Suspense } from "react";

import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { FiDrillPreview } from "@/components/financeiro/inteligencia/fi-drill-preview";
import { FiExpenseBreakdown } from "@/components/financeiro/inteligencia/fi-expense-breakdown";
import { FiInsightsPanel } from "@/components/financeiro/inteligencia/fi-insights-panel";
import { FiMetricGrid } from "@/components/financeiro/inteligencia/fi-metric-grid";
import { FiPeriodFilters } from "@/components/financeiro/inteligencia/fi-period-filters";
import { FiTrendsSection } from "@/components/financeiro/inteligencia/fi-trends-section";
import { ExecutivePage } from "@/components/executive";
import { SectionCard } from "@/components/ui/section-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { formatCurrency } from "@/lib/format";
import {
  createFinancialIntelligenceService,
  defaultDrePeriodo,
} from "@/lib/financial-intelligence";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";

export const metadata = { title: "Inteligência Financeira" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ dataDe?: string; dataAte?: string }>;
};

function FiltersFallback() {
  return <SkeletonCard lines={2} />;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const { dataDe, dataAte } = await searchParams;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.ver_dre",
      "financeiro.ver_fluxo_caixa",
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Inteligência"
          description="Cockpit de leitura executiva sobre DRE e Fluxo."
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
    dataDe: dataDe ?? defaults.dataDe,
    dataAte: dataAte ?? defaults.dataAte,
  };

  const service = await createFinancialIntelligenceService(
    auth.tenant.id,
    tenantSlug,
  );
  const snapshot = await service.getSnapshot(filters);

  return (
    <ExecutivePage width="wide" spacing="loose">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={auth.tenant.name}
        title="Inteligência"
        description={`Cockpit de leitura executiva · ${auth.tenant.name}. Consome DRE e Fluxo sem alterar regras.`}
      />

      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-6 py-8 text-white shadow-sm md:px-10">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative max-w-3xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-200/80">
            Sprint 13.18 · Financial Intelligence
          </p>
          <h2 className="font-serif text-3xl tracking-tight md:text-4xl">
            Visão executiva sobre o resultado já calculado.
          </h2>
          <p className="text-sm text-slate-200/85">
            Período {snapshot.periodoLabel} · comparação vs{" "}
            {snapshot.previousPeriodoLabel}. Caixa atual{" "}
            {formatCurrency(snapshot.fluxo.saldo_atual)}.
          </p>
        </div>
      </section>

      <Suspense fallback={<FiltersFallback />}>
        <FiPeriodFilters
          tenantSlug={tenantSlug}
          dataDe={filters.dataDe}
          dataAte={filters.dataAte}
        />
      </Suspense>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Cockpit</h2>
        <FiMetricGrid metrics={snapshot.cockpit} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Indicadores e margens
        </h2>
        <FiMetricGrid
          metrics={snapshot.margins}
          columnsClassName="md:grid-cols-2 xl:grid-cols-4"
        />
        <FiMetricGrid
          metrics={snapshot.opsKpis}
          columnsClassName="md:grid-cols-2 xl:grid-cols-3"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <FiExpenseBreakdown expenses={snapshot.expenses} />
        <FiInsightsPanel insights={snapshot.insights} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Top clientes" contentClassName="pt-0">
          {snapshot.topClientes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem vendas no período.</p>
          ) : (
            <ul className="space-y-2">
              {snapshot.topClientes.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span>{item.label}</span>
                  <span className="tabular-nums font-medium">
                    {formatCurrency(item.value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Top unidades (centros)" contentClassName="pt-0">
          {snapshot.topCentros.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem faturamento por centro no período.
            </p>
          ) : (
            <ul className="space-y-2">
              {snapshot.topCentros.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span>{item.label}</span>
                  <span className="tabular-nums font-medium">
                    {formatCurrency(item.value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <FiTrendsSection trends={snapshot.trends} />

      <FiDrillPreview
        tenantSlug={tenantSlug}
        items={snapshot.drillPreview}
        filters={filters}
      />
    </ExecutivePage>
  );
}
