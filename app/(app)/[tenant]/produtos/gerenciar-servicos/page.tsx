import { ModuleHeader } from "@/components/layout/module-header";
import { ServiceBulkPanel } from "@/components/produtos/service-bulk-panel";
import { ServiceCleanupPreviewPanel } from "@/components/produtos/service-cleanup-preview";
import { ActionButton } from "@/components/ui/action-button";
import { createServiceBulkService } from "@/lib/produtos/service-bulk-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Gerenciar base de serviços" };

type Props = {
  params: Promise<{ tenant: string }>;
};

export default async function GerenciarServicosPage({ params }: Props) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createServiceBulkService(tenant.id);
  const [services, preview] = await Promise.all([
    service.listServices(),
    service.previewCleanup(),
  ]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gerenciar base de serviços"
        description="Visualize, desative ou limpe serviços importados sem afetar produtos ou histórico."
        breadcrumbs={[
          { label: "Produtos & Serviços", href: `/${tenantSlug}/produtos` },
          { label: "Gerenciar serviços" },
        ]}
      >
        <ActionButton
          action="view"
          label="Qualidade"
          href={`/${tenantSlug}/produtos/qualidade-servicos`}
        />
        <ActionButton
          action="create"
          label="Importar serviços"
          href={`/${tenantSlug}/produtos/importar?kind=servicos`}
        />
      </ModuleHeader>

      <ServiceCleanupPreviewPanel tenantSlug={tenantSlug} preview={preview} />

      <ServiceBulkPanel
        tenantSlug={tenantSlug}
        services={services}
        arquivavelIds={preview.arquivavelIds}
      />
    </div>
  );
}
