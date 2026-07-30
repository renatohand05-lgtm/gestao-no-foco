import { ExecutiveHeader, ExecutivePage } from "@/components/executive";
import { OsImportWizardClient } from "@/components/import-engine/os-import-wizard-client";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SERVICE_ORDERS_IMPORT_ADAPTER } from "@/lib/import-engine/adapters/service-orders/adapter";
import { listOsImportHistory } from "@/lib/import-engine/adapters/service-orders/os-import-actions";
import { canAccessModuleImport } from "@/lib/import-engine/adapters/shared/require-import-access";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Importar Ordens de Serviço" };

export default async function ImportarOrdensPage({
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
        { label: "Ordens de Serviço" },
      ]}
    />
  );

  if (!canAccessModuleImport(tenant)) {
    return (
      <ExecutivePage width="wide" spacing="loose">
        {breadcrumbs}
        <ExecutiveHeader
          title="Importar Ordens de Serviço"
          description="Engine de importação Excel/CSV para Ordens de Serviço."
        />
        <p
          className="rounded-lg border border-amber-600/40 px-3 py-3 text-sm"
          role="alert"
          data-import-rbac="denied"
        >
          Sem permissão para importar dados em {SERVICE_ORDERS_IMPORT_ADAPTER.label} (
          {SERVICE_ORDERS_IMPORT_ADAPTER.requiredPermission}).
        </p>
      </ExecutivePage>
    );
  }

  const historyR = await listOsImportHistory(tenantSlug);
  const history = historyR.success ? historyR.history : [];

  return (
    <ExecutivePage width="wide" spacing="loose">
      {breadcrumbs}
      <ExecutiveHeader
        title="Importar Ordens de Serviço"
        description="Upload, mapeamento, classificação por regras e revisão de OS. Nesta fase, a confirmação regista as linhas em staging + histórico."
      />
      <OsImportWizardClient tenantSlug={tenantSlug} initialHistory={history} />
    </ExecutivePage>
  );
}
