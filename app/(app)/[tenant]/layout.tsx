import { AppShell } from "@/components/layout/app-shell";
import { getCurrentProfile } from "@/lib/auth/session";
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
  const [tenant, tenants, profile] = await Promise.all([
    requireTenant(tenantSlug),
    getUserTenants(),
    getCurrentProfile(),
  ]);

  return (
    <AppShell
      tenant={tenant}
      tenants={tenants}
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
