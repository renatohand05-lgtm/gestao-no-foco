"use client";

import { memo, Suspense, type ReactNode } from "react";

import { DemoModeProvider } from "@/components/demo/demo-mode-provider";
import { DemoModeControls } from "@/components/demo/demo-mode-controls";
import { DemoNavRail } from "@/components/demo/demo-nav-rail";
import { useDemoMode } from "@/components/demo/demo-mode-provider";
import { BrandInstitutionalFooter } from "@/components/brand/brand-institutional-footer";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageContainer } from "@/components/layout/page-container";
import { PlanSimulationBanner } from "@/components/layout/plan-simulation-banner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { TenantWithRole } from "@/types";

export type PlanSimulationInfo = {
  planSlug: string;
  planName: string;
  lockedNavIds: readonly string[];
};

type AppShellProps = {
  tenant: TenantWithRole;
  tenants: TenantWithRole[];
  permissions?: readonly string[];
  isPlatformPartner?: boolean;
  /** Modo "simular plano" ativo (só dono da plataforma) — nunca altera dados reais. */
  planSimulation?: PlanSimulationInfo | null;
  /** IDs de item de menu travados pelo plano REAL do tenant (Fase 2 do financeiro). */
  lockedNavIds?: readonly string[];
  user?: {
    email?: string;
    name?: string;
    avatarUrl?: string;
  };
  children: React.ReactNode;
};

/**
 * Slot memoizado: quando o chrome reage ao DemoMode, a página não re-renderiza
 * se a referência de children for estável (Sprint 29.1).
 */
const PageSlot = memo(function PageSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
});

function DemoAwareChrome({
  tenant,
  tenants,
  permissions,
  isPlatformPartner,
  planSimulation,
  lockedNavIds,
  user,
  children,
}: AppShellProps) {
  const { hide, active } = useDemoMode();
  const effectiveLockedNavIds = planSimulation?.lockedNavIds ?? lockedNavIds;

  return (
    <SidebarProvider
      defaultOpen={!hide.appSidebar}
      className={cn(
        "overflow-x-hidden",
        hide.appSidebar && "demo-fullscreen-shell",
      )}
    >
      {!hide.appSidebar ? (
        <AppSidebar
          tenant={tenant}
          tenants={tenants}
          permissions={permissions}
          isPlatformPartner={isPlatformPartner}
          lockedNavIds={effectiveLockedNavIds}
        />
      ) : null}
      <SidebarInset
        className={cn(
          "min-h-svh min-w-0 overflow-x-hidden bg-background",
          hide.appSidebar && "md:ml-0",
        )}
      >
        {!hide.appSidebar ? (
          <AppHeader
            tenantName={tenant.name}
            tenantSlug={tenant.slug}
            user={user}
          />
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
          {planSimulation ? (
            <PlanSimulationBanner planName={planSimulation.planName} />
          ) : null}
          {/* Sprint 30.1: chrome Apresentação colapsado por padrão (mobile-first). */}
          <div className="mb-3 space-y-2 md:mb-4">
            {!hide.appSidebar ? (
              <DemoModeControls
                compact
                defaultCollapsed
                className="max-w-3xl"
              />
            ) : null}
            {active ? <DemoNavRail tenantSlug={tenant.slug} /> : null}
          </div>
          <PageSlot>{children}</PageSlot>
        </PageContainer>
        {!hide.appSidebar ? (
          <BrandInstitutionalFooter compact className="mt-auto" />
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <Suspense
      fallback={
        <SidebarProvider>
          <AppSidebar
            tenant={props.tenant}
            tenants={props.tenants}
            permissions={props.permissions}
            isPlatformPartner={props.isPlatformPartner}
            lockedNavIds={props.planSimulation?.lockedNavIds ?? props.lockedNavIds}
          />
          <SidebarInset className="min-h-svh bg-background">
            <AppHeader
              tenantName={props.tenant.name}
              tenantSlug={props.tenant.slug}
              user={props.user}
            />
            <PageContainer>{props.children}</PageContainer>
          </SidebarInset>
        </SidebarProvider>
      }
    >
      <DemoModeProvider tenantSlug={props.tenant.slug}>
        <DemoAwareChrome
          tenant={props.tenant}
          tenants={props.tenants}
          permissions={props.permissions}
          isPlatformPartner={props.isPlatformPartner}
          planSimulation={props.planSimulation}
          lockedNavIds={props.lockedNavIds}
          user={props.user}
        >
          {props.children}
        </DemoAwareChrome>
      </DemoModeProvider>
    </Suspense>
  );
}
