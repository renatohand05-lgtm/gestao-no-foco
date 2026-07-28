import { MovimentacoesClient } from "@/components/finance/movimentacoes-client";
import { ModuleHeader } from "@/components/layout/module-header";
import {
  listBankAccounts,
  listCategories,
  listCostCenters,
  listMovements,
} from "@/lib/finance/actions";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Movimentações" };

export default async function MovimentacoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  const [accounts, movements, categories, costCenters] = await Promise.all([
    listBankAccounts(tenantSlug),
    listMovements(tenantSlug),
    listCategories(tenantSlug),
    listCostCenters(tenantSlug),
  ]);

  const error =
    (!accounts.success && accounts.error) ||
    (!movements.success && movements.error) ||
    (!categories.success && categories.error) ||
    (!costCenters.success && costCenters.error);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Movimentações"
        description="Entradas, saídas, transferências, ajustes e estornos"
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Movimentações" },
        ]}
      />
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <MovimentacoesClient
          tenantSlug={tenantSlug}
          accounts={accounts.success ? accounts.accounts : []}
          movements={movements.success ? movements.movements : []}
          categories={categories.success ? categories.categories : []}
          costCenters={costCenters.success ? costCenters.costCenters : []}
        />
      )}
    </div>
  );
}
