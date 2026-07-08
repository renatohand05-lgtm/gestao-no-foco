import { getCurrentProfile } from "@/lib/auth/session";
import { getDashboardMockData } from "@/lib/dashboard/mock-data";
import { requireTenant } from "@/lib/tenants";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();

  const data = getDashboardMockData({
    tenantName: tenant.name,
    tenantSegment: tenant.segment,
    userName: profile?.name,
  });

  return <DashboardContent data={data} />;
}
