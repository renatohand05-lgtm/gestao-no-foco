import Link from "next/link";

import { CostCenterManager } from "@/components/finance/cost-center-manager";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { Button } from "@/components/ui/button";
import { listCostCenters } from "@/lib/finance/actions";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";

export const metadata = { title: "Centros de Custo" };

export default async function CentrosCustoEnterprisePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Centros de custo"
          description="Cadastro, edição e arquivamento · associação em movimentações."
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
  const result = await listCostCenters(tenantSlug);

  return (
    <div className="space-y-6">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={tenant.name}
        title="Centros de custo"
        description="Cadastro, edição e arquivamento · associação em movimentações."
        actions={
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/${tenantSlug}/financeiro/centros-custo/novo`} />
            }
          >
            Novo centro
          </Button>
        }
      />
      {!result.success ? (
        <p className="text-sm text-red-600" role="alert">
          {result.error}
        </p>
      ) : (
        <CostCenterManager
          tenantSlug={tenantSlug}
          costCenters={result.costCenters}
        />
      )}
    </div>
  );
}
