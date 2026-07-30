import { ContasClient } from "@/components/finance/contas-client";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { listBankAccounts } from "@/lib/finance/actions";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";

export const metadata = { title: "Contas bancárias" };

export default async function ContasPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.contas.visualizar",
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Contas bancárias"
          description="Cadastro Enterprise · banco, agência, conta, tipo e saldo."
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
  const result = await listBankAccounts(tenantSlug);

  return (
    <div className="space-y-6">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={tenant.name}
        title="Contas bancárias"
        description="Cadastro Enterprise · banco, agência, conta, tipo e saldo."
      />
      {!result.success ? (
        <p className="text-sm text-red-600" role="alert">
          {result.error}
        </p>
      ) : (
        <ContasClient tenantSlug={tenantSlug} accounts={result.accounts} />
      )}
    </div>
  );
}
