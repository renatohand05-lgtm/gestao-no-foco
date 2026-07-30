import { ExecutiveCrmDashboard } from "@/components/crm/executive-crm-dashboard";
import { getExecutiveCrmDashboard } from "@/lib/crm/crm-enterprise-actions";
import { isCrmEnterpriseEnabled } from "@/lib/crm/crm-feature-flags";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "CRM Executivo Enterprise" };

export default async function CrmExecutivoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  if (!isCrmEnterpriseEnabled()) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        CRM Enterprise desabilitado por feature flag.
      </p>
    );
  }

  const bundle = await getExecutiveCrmDashboard(tenantSlug);
  return (
    <ExecutiveCrmDashboard tenantSlug={tenantSlug} initialBundle={bundle} />
  );
}
