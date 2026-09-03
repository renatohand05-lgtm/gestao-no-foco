import { AppShell } from "@/components/layout/app-shell";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCommercialPlan } from "@/lib/billing/catalog";
import {
  lockedNavIdsForPlan,
  type CommercialPlanSlug,
} from "@/lib/billing/plan-feature-matrix";
import { resolveTenantNavPermissions } from "@/lib/navigation/resolve-nav-auth";
import { isPlatformPartner } from "@/lib/platform/platform-access-service";
import { getPlanSimulationSlug } from "@/lib/platform/plan-simulation";
import { getUserTenants, requireTenant } from "@/lib/tenants";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  // Cold path: paralelo (React.cache já deduplica se a page também chamar).
  // isPlatformPartner() é uma checagem leve (1 linha) — não recalcula
  // financeiro de nenhuma empresa, diferente de getPlatformAccess().
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

  return (
    <AppShell
      tenant={tenant}
      tenants={tenants}
      permissions={permissions}
      isPlatformPartner={isPartner}
      planSimulation={planSimulation}
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
