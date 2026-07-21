import { CrmDashboard } from "@/components/crm/crm-dashboard";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { ModuleHeader } from "@/components/layout/module-header";
import { createCrmDashboardService } from "@/lib/crm/cliente-360-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Dashboard comercial" };

export default async function ClientesDashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createCrmDashboardService(tenant.id);
  const kpis = await service.getKpis(30);

  return (
    <div className="space-y-6">
      <CrmSubnav tenantSlug={tenantSlug} active="clientes/dashboard" />
      <ModuleHeader
        title="Dashboard comercial"
        description="KPIs de relacionamento e conversão (últimos 30 dias)"
        breadcrumbs={[
          { label: "Clientes", href: `/${tenantSlug}/clientes` },
          { label: "Dashboard" },
        ]}
      />
      <CrmDashboard kpis={kpis} />
    </div>
  );
}
