import { redirect } from "next/navigation";

import { FinancePageHeader } from "@/components/finance/finance-page-header";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";

/**
 * Sprint 22.2 RC2 — Dashboard Enterprise = Tesouraria (`/financeiro`).
 * Alias canónico preservado; cockpit Inteligência vive em `/inteligencia`.
 */
export default async function FinanceiroDashboardRedirect({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  try {
    await requireFinancePagePermission(tenantSlug, [
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

  redirect(`/${tenantSlug}/financeiro`);
}
