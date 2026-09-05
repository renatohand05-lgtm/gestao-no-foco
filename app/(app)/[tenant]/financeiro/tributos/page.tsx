import { Suspense } from "react";

import { ExecutiveTaxDashboardClient } from "@/components/finance/tax-intelligence/executive-tax-dashboard";
import { TaxReform2027Panel } from "@/components/finance/tax-intelligence/tax-reform-2027-panel";
import { FinanceFeatureLocked } from "@/components/finance/finance-feature-locked";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isFinanceFeatureUnlocked } from "@/lib/billing/finance-entitlement";
import {
  financePageAuthError,
  requireFinancePagePermission, 
} from "@/lib/finance/page-auth";
import { getTaxIntelligenceDashboard } from "@/lib/finance/tax-intelligence/tax-intelligence-actions";
import { isTaxIntelligenceEnabled } from "@/lib/finance/tax-intelligence";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Tributos Enterprise" };

export default async function TributosEnterprisePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  if (!isTaxIntelligenceEnabled()) {
    return (
      <div className="p-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Tributos Enterprise"
          description="Módulo desabilitado por feature flag TAX_INTELLIGENCE_ENABLED."
        />
      </div>
    );
  }

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.visualizar",
      "financeiro.tributos.visualizar",
    ]);
  } catch (error) {
    const authErr = financePageAuthError(error);
    return (
      <div className="p-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Tributos Enterprise"
          description={authErr.message}
        />
      </div>
    );
  }

  const client = await createClient();
  const unlocked = await isFinanceFeatureUnlocked(
    client,
    auth.tenant.id,
    "tributario",
  );
  if (!unlocked) {
    return (
      <div className="p-6 space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Tributos Enterprise"
        />
        <FinanceFeatureLocked
          tenantSlug={tenantSlug}
          feature="tributario"
          title="Tributos"
        />
      </div>
    );
  }

  const res = await getTaxIntelligenceDashboard(tenantSlug);

  if (!res.success) {
    return (
      <div className="p-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Tributos Enterprise"
          description={res.error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        title="Inteligência Tributária Enterprise"
        description="Carga consolidada, Reforma Tributária, simulações, ranking, fluxo de caixa tributário e IA com revisão humana — regras 100% parametrizadas."
      />
      <TaxReform2027Panel tenantSlug={tenantSlug} />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ExecutiveTaxDashboardClient
          tenantSlug={tenantSlug}
          dashboard={res.dashboard}
          alerts={res.alerts}
          cashflow={res.cashflow}
          ai={res.ai}
          supplierRanking={res.supplierRanking}
          report={res.report}
          integrations={res.integrations}
          snapshotEmpty={res.snapshotEmpty}
        />
      </Suspense>
    </div>
  );
}
