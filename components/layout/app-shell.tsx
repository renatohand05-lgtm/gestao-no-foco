"use client";

import { Suspense } from "react";

import { DemoModeProvider } from "@/components/demo/demo-mode-provider";
import { DemoModeControls } from "@/components/demo/demo-mode-controls";
import { DemoNavRail } from "@/components/demo/demo-nav-rail";
import { useDemoMode } from "@/components/demo/demo-mode-provider";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageContainer } from "@/components/layout/page-container";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
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

function DemoAwareChrome({
  tenant,
  tenants,
  user,
  children,
}: AppShellProps) {
  const { hide, active } = useDemoMode();

  return (
    <SidebarProvider
      defaultOpen={!hide.appSidebar}
      className={cn(hide.appSidebar && "demo-fullscreen-shell")}
    >
      {!hide.appSidebar ? (
        <AppSidebar tenant={tenant} tenants={tenants} />
      ) : null}
      <SidebarInset
        className={cn(
          "min-h-svh bg-[#eef1f5] dark:bg-background",
          hide.appSidebar && "md:ml-0",
        )}
      >
        {!hide.appSidebar ? (
          <AppHeader tenantName={tenant.name} user={user} />
        ) : (
          <div className="sticky top-0 z-30 border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur">
            <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold">{tenant.name}</p>
              <DemoModeControls
                compact
                className="max-w-xl border-0 bg-transparent p-0"
              />
            </div>
          </div>
        )}

        <PageContainer>
          <div className="mb-4 space-y-3">
            {!hide.appSidebar ? (
              <DemoModeControls compact={!active} />
            ) : null}
            <DemoNavRail tenantSlug={tenant.slug} />
          </div>
          {children}
        </PageContainer>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <Suspense
      fallback={
        <SidebarProvider>
          <AppSidebar tenant={props.tenant} tenants={props.tenants} />
          <SidebarInset className="min-h-svh bg-[#eef1f5] dark:bg-background">
            <AppHeader tenantName={props.tenant.name} user={props.user} />
            <PageContainer>{props.children}</PageContainer>
          </SidebarInset>
        </SidebarProvider>
      }
    >
      <DemoModeProvider tenantSlug={props.tenant.slug}>
        <DemoAwareChrome {...props} />
      </DemoModeProvider>
    </Suspense>
  );
}
