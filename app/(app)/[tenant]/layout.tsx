import { AppShell } from "@/components/layout/app-shell";
import { getCurrentProfile } from "@/lib/auth/session";
import { resolveTenantNavPermissions } from "@/lib/navigation/resolve-nav-auth";
import { getPlatformAccess } from "@/lib/platform/platform-access-service";
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
  const [tenant, tenants, profile, platformAccess] = await Promise.all([
    requireTenant(tenantSlug),
    getUserTenants(),
    getCurrentProfile(),
    getPlatformAccess(),
  ]);
  const permissions = await resolveTenantNavPermissions(tenant);

  return (
    <AppShell
      tenant={tenant}
      tenants={tenants}
      permissions={permissions}
      isPlatformPartner={Boolean(platformAccess)}
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
