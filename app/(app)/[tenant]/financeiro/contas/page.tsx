import { ContasClient } from "@/components/finance/contas-client";
import { ModuleHeader } from "@/components/layout/module-header";
import { listBankAccounts } from "@/lib/finance/actions";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Contas bancárias" };

export default async function ContasPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);
  const result = await listBankAccounts(tenantSlug);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Contas bancárias"
        description="Cadastro Enterprise · banco, agência, conta, tipo e saldo"
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Contas" },
        ]}
      />
      {!result.success ? (
        <p className="text-sm text-red-600">{result.error}</p>
      ) : (
        <ContasClient tenantSlug={tenantSlug} accounts={result.accounts} />
      )}
    </div>
  );
}
