import { Suspense } from "react";

import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { TreasuryDashboardClient } from "@/components/finance/treasury-dashboard-client";
import {
  getTreasuryAccounts,
  getTreasuryAlerts,
  getTreasuryBalanceEvolution,
  getTreasuryInsights,
  getTreasurySummary,
} from "@/lib/finance/actions";
import type { TreasuryPeriodKey } from "@/lib/finance";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";

export const metadata = { title: "Dashboard Enterprise" };

function parsePeriod(raw: string | undefined): TreasuryPeriodKey {
  const allowed: TreasuryPeriodKey[] = [
    "today",
    "7d",
    "30d",
    "60d",
    "90d",
    "12m",
    "this_month",
    "last_month",
    "this_year",
    "custom",
  ];
  if (raw && allowed.includes(raw as TreasuryPeriodKey)) {
    return raw as TreasuryPeriodKey;
  }
  return "30d";
}

function isPermissionError(result: {
  success: boolean;
  error?: string;
  code?: string;
}) {
  if (result.success) return false;
  return (
    result.code === "FINANCE_PERMISSION_DENIED" ||
    result.code === "FINANCE_CONFIG_PENDING" ||
    /permiss|RBAC|autoriz/i.test(result.error ?? "")
  );
}

export default async function FinanceiroDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.visualizar",
      "financeiro.ver_saldos",
      "financeiro.contas.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Dashboard"
          description="Posição consolidada de caixa, evolução, insights e alertas."
          breadcrumbs={[
            { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
            { label: "Dashboard" },
          ]}
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

  const { tenant } = auth;
  const periodKey = parsePeriod(
    typeof sp.period === "string" ? sp.period : undefined,
  );
  const custom =
    periodKey === "custom"
      ? {
          from: typeof sp.from === "string" ? sp.from : undefined,
          to: typeof sp.to === "string" ? sp.to : undefined,
        }
      : undefined;

  const [summaryR, evolutionR, accountsR, insightsR, alertsR] =
    await Promise.all([
      getTreasurySummary(tenantSlug, periodKey, custom),
      getTreasuryBalanceEvolution(tenantSlug, periodKey, null, custom),
      getTreasuryAccounts(tenantSlug),
      getTreasuryInsights(tenantSlug, periodKey),
      getTreasuryAlerts(tenantSlug, periodKey),
    ]);

  const permissionDenied =
    isPermissionError(summaryR) ||
    isPermissionError(evolutionR) ||
    isPermissionError(accountsR);

  const loadError =
    !permissionDenied &&
    ((!summaryR.success && summaryR.error) ||
      (!evolutionR.success && evolutionR.error) ||
      (!accountsR.success && accountsR.error) ||
      null);

  const summary = summaryR.success ? summaryR.summary : null;
  const accounts = accountsR.success ? accountsR.accounts : [];

  let state:
    | "ok"
    | "permission_denied"
    | "load_error"
    | "empty_accounts"
    | "empty_period" = "ok";
  if (permissionDenied) state = "permission_denied";
  else if (loadError) state = "load_error";
  else if (summary && accounts.length === 0) state = "empty_accounts";
  else if (summary && summary.inflows === 0 && summary.outflows === 0) {
    state = "empty_period";
  }

  const permissionMessage = permissionDenied
    ? (!summaryR.success ? summaryR.error : undefined) ||
      (!accountsR.success ? accountsR.error : undefined) ||
      "Sem permissão para a tesouraria."
    : null;

  const loadErrorMessage = typeof loadError === "string" ? loadError : null;

  return (
    <div className="space-y-6">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={tenant.name}
        title="Dashboard"
        description="Posição consolidada de caixa, evolução, insights e alertas."
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Dashboard" },
        ]}
      />

      <Suspense
        fallback={<p className="text-sm text-muted-foreground">A carregar…</p>}
      >
        <TreasuryDashboardClient
          tenantSlug={tenantSlug}
          periodKey={periodKey}
          summary={summary}
          evolution={evolutionR.success ? evolutionR.evolution : null}
          accounts={accounts}
          insights={insightsR.success ? insightsR.insights : []}
          alerts={alertsR.success ? alertsR.alerts : []}
          error={permissionMessage ?? loadErrorMessage}
          errorCode={
            !summaryR.success
              ? summaryR.code
              : !accountsR.success
                ? accountsR.code
                : null
          }
          state={state}
        />
      </Suspense>
    </div>
  );
}
