import { ExecutiveSupplyDashboard } from "@/components/supply/executive-supply-dashboard";
import { getExecutiveSupplyDashboard } from "@/lib/supply/supply-enterprise-actions";
import { isSupplyEnterpriseEnabled } from "@/lib/supply/supply-feature-flags";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Supply Executivo Enterprise" };

export default async function ComprasExecutivoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  if (!isSupplyEnterpriseEnabled()) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Supply Enterprise desabilitado por feature flag.
      </p>
    );
  }

  const bundle = await getExecutiveSupplyDashboard(tenantSlug);
  return (
    <ExecutiveSupplyDashboard tenantSlug={tenantSlug} initialBundle={bundle} />
  );
}
