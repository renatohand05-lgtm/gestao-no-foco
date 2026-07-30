import { ReconciliationClient } from "@/components/finance/cash-intelligence/reconciliation-client";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import { getTreasuryAccounts } from "@/lib/finance/actions";
import { listBankStatementLines } from "@/lib/finance/cash-intelligence/cash-intelligence-actions";

export const metadata = { title: "Conciliação Bancária" };

export default async function ConciliacaoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  try {
    await requireFinancePagePermission(tenantSlug, [
      "financeiro.visualizar",
      "financeiro.criar",
      "financeiro.editar",
      "financeiro.conciliar",
    ]);
  } catch (error) {
    const auth = financePageAuthError(error);
    return (
      <div className="p-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Conciliação Bancária"
          description={auth.message}
        />
      </div>
    );
  }

  const accountsR = await getTreasuryAccounts(tenantSlug);
  const accounts = accountsR.success
    ? accountsR.accounts.map((a) => ({
        id: a.account.id,
        name: a.account.name,
      }))
    : [];
  const bankAccountId = accounts[0]?.id ?? null;

  const linesR = bankAccountId
    ? await listBankStatementLines(tenantSlug, { bankAccountId })
    : { success: true as const, lines: [] };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        title="Conciliação Bancária Enterprise"
        description="Matching por valor, data, descrição, documento e identificador externo — com confirmação humana e persistência Supabase."
      />
      <ReconciliationClient
        tenantSlug={tenantSlug}
        bankAccountId={bankAccountId}
        accounts={accounts}
        initialLines={linesR.success ? linesR.lines : []}
        initialError={linesR.success ? null : linesR.error}
      />
    </div>
  );
}
