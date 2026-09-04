import { FinanceFeatureLocked } from "@/components/finance/finance-feature-locked";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { TransferForm } from "@/components/finance/transfer-form";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { isFinanceFeatureUnlocked } from "@/lib/billing/finance-entitlement";
import { listBankAccounts } from "@/lib/finance/actions";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Transferências" };

export default async function TransferenciasPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  let auth;
  try {
    // Somente quem pode transferir (menu = financeiro.transferir). Leitura não abre via URL.
    auth = await requireFinancePagePermission(
      tenantSlug,
      "financeiro.transferir",
    );
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Transferências"
          description="Movimentação atómica entre contas com idempotência."
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

  const client = await createClient();
  const unlocked = await isFinanceFeatureUnlocked(
    client,
    tenant.id,
    "financeiro_avancado",
  );
  if (!unlocked) {
    return (
      <div className="space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          tenantName={tenant.name}
          title="Transferências"
          description="Movimentação atómica entre contas com idempotência."
        />
        <FinanceFeatureLocked
          tenantSlug={tenantSlug}
          feature="financeiro_avancado"
          title="Transferências"
        />
      </div>
    );
  }

  const accounts = await listBankAccounts(tenantSlug);

  return (
    <div className="space-y-6">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={tenant.name}
        title="Transferências"
        description="Movimentação atómica entre contas com idempotência."
      />
      {!accounts.success ? (
        <p className="text-sm text-red-600" role="alert">
          {accounts.error}
        </p>
      ) : (
        <Card className="max-w-lg border-border/40 shadow-sm ring-1 ring-border/10">
          <CardContent className="pt-4">
            <TransferForm
              tenantSlug={tenantSlug}
              accounts={accounts.accounts}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
