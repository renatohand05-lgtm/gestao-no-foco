import { Suspense } from "react";

import { ExecutiveCashDashboardClient } from "@/components/finance/cash-intelligence/executive-cash-dashboard";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCashIntelligenceDashboard } from "@/lib/finance/cash-intelligence/cash-intelligence-actions";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";

export const metadata = { title: "Caixa & Tesouraria Enterprise" };

export default async function CaixaTesourariaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ horizon?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;

  try {
    await requireFinancePagePermission(tenantSlug, [
      "financeiro.visualizar",
      "financeiro.ver_saldos",
      "financeiro.ver_fluxo_caixa",
    ]);
  } catch (error) {
    const auth = financePageAuthError(error);
    return (
      <div className="p-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Caixa & Tesouraria"
          description={auth.message}
        />
      </div>
    );
  }

  const horizonRaw = Number(sp.horizon ?? 30);
  const horizon = [30, 60, 90, 365].includes(horizonRaw) ? horizonRaw : 30;
  const res = await getCashIntelligenceDashboard(tenantSlug, {
    horizonDays: horizon,
  });

  if (!res.success) {
    return (
      <div className="p-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Caixa & Tesouraria"
          description={res.error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        title="Central Enterprise de Caixa e Tesouraria"
        description="Saldo consolidado, realizado / previsto / projetado, alertas, capital de giro e simulações — sem misturar camadas."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ExecutiveCashDashboardClient
          tenantSlug={tenantSlug}
          initialDashboard={res.dashboard}
          initialHorizon={horizon}
        />
      </Suspense>
    </div>
  );
}
