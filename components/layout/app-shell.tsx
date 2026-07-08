import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageContainer } from "@/components/layout/page-container";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { TenantWithRole } from "@/types";

type AppShellProps = {
  tenant: TenantWithRole;
  tenants: TenantWithRole[];
  user?: {
    email?: string;
    name?: string;
    avatarUrl?: string;
  };
  children: React.ReactNode;
};

export function AppShell({ tenant, tenants, user, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar tenant={tenant} tenants={tenants} />
      <SidebarInset className="min-h-svh bg-muted/20">
        <AppHeader
          tenantName={tenant.name}
          user={user}
        />
        <PageContainer>{children}</PageContainer>
      </SidebarInset>
    </SidebarProvider>
  );
}
