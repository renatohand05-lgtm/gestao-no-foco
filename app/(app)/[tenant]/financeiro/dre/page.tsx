import Link from "next/link";
import { Suspense } from "react";

import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { DreComparativeExportButtons } from "@/components/financeiro/dre-comparative-export-buttons";
import { DreComparativeFilters } from "@/components/financeiro/dre-comparative-filters";
import { DreComparativeStatement } from "@/components/financeiro/dre-comparative-statement";
import { DreCompositionDonut } from "@/components/financeiro/dre-composition-donut";
import { DreDrillPanel } from "@/components/financeiro/dre-drill-panel";
import { DreEvolutionChart } from "@/components/financeiro/dre-evolution-chart";
import { DreFilters } from "@/components/financeiro/dre-filters";
import { DreGapsPanel } from "@/components/financeiro/dre-gaps-panel";
import { DreIndicatorsPanel } from "@/components/financeiro/dre-indicators-panel";
import { DreStatement } from "@/components/financeiro/dre-statement";
import { DreSummaryCards } from "@/components/financeiro/dre-summary-cards";
import { DreVerticalAnalysis } from "@/components/financeiro/dre-vertical-analysis";
import { buttonVariants } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import {
  buildCalendarMonthPeriod,
  buildDreComparativeView,
  MONTH_LABELS_PT,
} from "@/lib/dre/dre-compare";
import {
  getDreComposicaoLucro,
  getDreEvolution,
  getDreIndicators,
  getDreVerticalAnalysis,
} from "@/lib/dre/dre-insights-service";
import {
  createDreService,
  defaultDrePeriodo,
} from "@/lib/financeiro/dre-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import { ExecutivePage } from "@/components/executive";
import { cn } from "@/lib/utils";
import { formatPeriodoLabel } from "@/lib/dashboard/period";

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
    comparativo?: string;
    ano?: string;
    mesA?: string;
    mesB?: string;
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
  const sp = await searchParams;
  const {
    centroCusto,
    categoria,
    planoConta,
    dataDe,
    dataAte,
    linha,
    detalhe,
    comparativo,
  } = sp;

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

  const service = await createDreService(auth.tenant.id);
  const isComparativo = comparativo === "1";

  if (isComparativo) {
    const now = new Date();
    const year = Number(sp.ano) > 2000 ? Number(sp.ano) : now.getFullYear();
    const mesA =
      Number(sp.mesA) >= 1 && Number(sp.mesA) <= 12
        ? Number(sp.mesA)
        : Math.max(1, now.getMonth()); // previous calendar month default
    const mesB =
      Number(sp.mesB) >= 1 && Number(sp.mesB) <= 12
        ? Number(sp.mesB)
        : now.getMonth() + 1;

    const periodA = buildCalendarMonthPeriod(year, mesA);
    const periodB = buildCalendarMonthPeriod(year, mesB);
    const shared = {
      centroCustoId: centroCusto || undefined,
      categoriaId: categoria || undefined,
      planoContaId: planoConta || undefined,
    };

    const [dreA, dreB] = await Promise.all([
      service.getDre({ ...shared, ...periodA }),
      service.getDre({ ...shared, ...periodB }),
    ]);

    const mesALabel = `${MONTH_LABELS_PT[mesA - 1]} ${year}`;
    const mesBLabel = `${MONTH_LABELS_PT[mesB - 1]} ${year}`;
    const view = buildDreComparativeView(dreA, dreB, {
      mesA: mesALabel,
      mesB: mesBLabel,
    });

    const drill =
      linha && dreB.drillItems
        ? dreB.drillItems.filter((item) => {
            if (item.linha !== linha) return false;
            if (!detalhe) return true;
            if (detalhe === "__none__") return !item.detalhe;
            return item.detalhe === detalhe;
          })
