import { FinanceFeatureLocked } from "@/components/finance/finance-feature-locked";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { ImportWizardClient } from "@/components/finance/import/import-wizard-client";
import { isFinanceFeatureUnlocked } from "@/lib/billing/finance-entitlement";
import { listBankAccounts } from "@/lib/finance/actions";
import { listFinanceImportHistory } from "@/lib/finance/import/import-actions";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Importar Dados" };

export default async function ImportarDadosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, "financeiro.criar");
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Importar Dados"
          description="Engine de importação Excel/CSV."
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

  const client = await createClient();
  const unlocked = await isFinanceFeatureUnlocked(
    client,
    auth.tenant.id,
    "integracoes",
  );
  if (!unlocked) {
    return (
      <div className="space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Importar Dados"
          description="Engine de importação Excel/CSV."
        />
        <FinanceFeatureLocked
          tenantSlug={tenantSlug}
          feature="integracoes"
          title="Importação de dados"
        />
      </div>
    );
  }

  const [accountsR, historyR] = await Promise.all([
    listBankAccounts(tenantSlug),
    listFinanceImportHistory(tenantSlug),
  ]);

  const accounts = accountsR.success ? accountsR.accounts : [];
  const history = historyR.success ? historyR.history : [];

  return (
    <div className="space-y-6">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={auth.tenant.name}
        title="Importar Dados"
        description="Upload, mapeamento, classificação por regras e importação confirmada de movimentações."
      />

      {!accountsR.success ? (
        <p className="text-sm text-red-700" role="alert">
          {accountsR.error}
        </p>
      ) : null}

      <ImportWizardClient
        tenantSlug={tenantSlug}
        accounts={accounts}
        initialHistory={history}
      />
    </div>
  );
}
