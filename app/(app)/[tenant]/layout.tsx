import { AppShell } from "@/components/layout/app-shell";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCommercialPlan } from "@/lib/billing/catalog";
import { getTenantCommercialPlanSlug } from "@/lib/billing/finance-entitlement";
import {
  lockedNavIdsForPlan,
  type CommercialPlanSlug,
} from "@/lib/billing/plan-feature-matrix";
import { resolveTenantNavPermissions } from "@/lib/navigation/resolve-nav-auth";
import { isPlatformPartner } from "@/lib/platform/platform-access-service";
import { getPlanSimulationSlug } from "@/lib/platform/plan-simulation";
import { createClient } from "@/lib/supabase/server";
import { getUserTenants, requireTenant } from "@/lib/tenants";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const [tenant, tenants, profile, isPartner, planSimSlug] = await Promise.all([
    requireTenant(tenantSlug),
    getUserTenants(),
    getCurrentProfile(),
    isPlatformPartner(),
    getPlanSimulationSlug(),
  ]);
  const permissions = await resolveTenantNavPermissions(tenant);

  const planSimulation = planSimSlug
    ? {
        planSlug: planSimSlug,
        planName: getCommercialPlan(planSimSlug)?.name ?? planSimSlug,
        lockedNavIds: lockedNavIdsForPlan(planSimSlug as CommercialPlanSlug),
      }
    : null;

  const client = await createClient();
  const realPlanSlug = await getTenantCommercialPlanSlug(client, tenant.id);
  const lockedNavIds = realPlanSlug
    ? lockedNavIdsForPlan(realPlanSlug as CommercialPlanSlug)
    : [];

  return (
    <AppShell
      tenant={tenant}
      tenants={tenants}
      permissions={permissions}
      isPlatformPartner={isPartner}
      planSimulation={planSimulation}
      lockedNavIds={lockedNavIds}
      user={{
        email: profile?.email,
        name: profile?.name ?? undefined,
        avatarUrl: profile?.avatarUrl ?? undefined,
      }}
    >
      {children}
    </AppShell>
  );
}
