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
  const tenant = await requireTenant(tenantSlug);
  const tenants = await getUserTenants();
  const profile = await getCurrentProfile();

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
