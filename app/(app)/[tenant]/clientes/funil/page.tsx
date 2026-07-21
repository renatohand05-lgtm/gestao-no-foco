import { CrmFunilBoard } from "@/components/crm/crm-funil-board";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { ModuleHeader } from "@/components/layout/module-header";
import { createCrmFunilService } from "@/lib/crm/crm-funnel-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Funil comercial" };

export default async function ClientesFunilPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createCrmFunilService(tenant.id);
  const [columns, columnStats] = await Promise.all([
    service.listByStage(),
    service.getColumnStats(),
  ]);

  return (
    <div className="space-y-6">
      <CrmSubnav tenantSlug={tenantSlug} active="clientes/funil" />
      <ModuleHeader
        title="Funil comercial"
        description="Kanban de leads e oportunidades"
        breadcrumbs={[
          { label: "Clientes", href: `/${tenantSlug}/clientes` },
          { label: "Funil" },
        ]}
      />
      <CrmFunilBoard
        tenantSlug={tenantSlug}
        columns={columns}
        columnStats={columnStats}
      />
    </div>
  );
}
