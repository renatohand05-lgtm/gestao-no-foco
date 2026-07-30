import { ExecutiveHeader, ExecutivePage } from "@/components/executive";
import { SalesImportWizardClient } from "@/components/import-engine/sales-import-wizard-client";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SALES_IMPORT_ADAPTER } from "@/lib/import-engine/adapters/sales/adapter";
import { listSalesImportHistory } from "@/lib/import-engine/adapters/sales/sales-import-actions";
import { canAccessModuleImport } from "@/lib/import-engine/adapters/shared/require-import-access";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Importar Vendas" };

export default async function ImportarVendasPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: "Integrações", href: `/${tenantSlug}/integracoes` },
        { label: "Importar Arquivos", href: `/${tenantSlug}/integracoes/importar` },
        { label: "Vendas" },
      ]}
    />
  );

  if (!canAccessModuleImport(tenant)) {
    return (
      <ExecutivePage width="wide" spacing="loose">
        {breadcrumbs}
        <ExecutiveHeader
          title="Importar Vendas"
          description="Engine de importação Excel/CSV para o módulo de Vendas."
        />
        <p
          className="rounded-lg border border-amber-600/40 px-3 py-3 text-sm"
          role="alert"
          data-import-rbac="denied"
        >
          Sem permissão para importar dados em {SALES_IMPORT_ADAPTER.label} (
          {SALES_IMPORT_ADAPTER.requiredPermission}).
        </p>
      </ExecutivePage>
    );
  }

  const historyR = await listSalesImportHistory(tenantSlug);
  const history = historyR.success ? historyR.history : [];

  return (
    <ExecutivePage width="wide" spacing="loose">
      {breadcrumbs}
      <ExecutiveHeader
        title="Importar Vendas"
        description="Upload, mapeamento, classificação por regras e revisão de vendas. Nesta fase, a confirmação regista as linhas em staging + histórico."
      />
      <SalesImportWizardClient tenantSlug={tenantSlug} initialHistory={history} />
    </ExecutivePage>
  );
}
