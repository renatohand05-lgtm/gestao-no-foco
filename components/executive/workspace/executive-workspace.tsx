"use client";

import { WorkspaceProvider } from "@/components/executive/workspace/workspace-context";
import { ExecutiveCommandBar } from "@/components/executive/workspace/executive-command-bar";
import { ExecutiveTopBar } from "@/components/executive/workspace/executive-top-bar";
import { ExecutiveLayoutManager } from "@/components/executive/layout";
import { ExecutiveDashboardShell } from "@/components/dashboard/executive/executive-dashboard-shell";
import { DemoCommercialHeroFrame } from "@/components/demo/demo-commercial-hero-frame";
import { DemoHide } from "@/components/demo/demo-hide";
import { cn } from "@/lib/utils";
import type { BootstrapLayoutResult } from "@/lib/dashboard-layout/persistence/types";
import type {
  DashboardFilterOptions,
  DashboardFilters,
} from "@/types/dashboard-executive";

type Props = {
  tenantSlug: string;
  tenantName: string;
  greeting?: string;
  filters: DashboardFilters;
  filterOptions: DashboardFilterOptions;
  updatedAtLabel: string;
  layoutBootstrap?: BootstrapLayoutResult | null;
  legacyHeader?: React.ReactNode;
  /** Conteúdo soft acima do layout (ex.: banner de onboarding). Não altera Hero/KPIs. */
  lead?: React.ReactNode;
  /**
   * Conteúdo fixo acima do grid reordenável (sempre visível).
   * Usado pelo Resumo de Vendas do Mês — não passa pelo LayoutSlot.
   */
  aboveLayout?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/**
 * Chrome mínimo antes do Hero.
 * Layout persistente hidratado via bootstrap (Sprint 13.6).
 * Demo Mode (13.13) apenas oculta chrome técnico.
 */
export function ExecutiveWorkspace({
  tenantSlug,
  tenantName,
  greeting,
  filters,
  updatedAtLabel,
  layoutBootstrap = null,
  lead,
  aboveLayout,
  children,
  footer,
}: Props) {
  return (
    <WorkspaceProvider>
      <div className="min-h-full bg-transparent">
        <ExecutiveDashboardShell className={cn("relative gap-4 pb-16 pt-1 lg:gap-5")}>
          <ExecutiveTopBar
            tenantName={tenantName}
            dataDe={filters.dataDe}
            dataAte={filters.dataAte}
            greeting={greeting}
            updatedAtLabel={updatedAtLabel}
          />

          <DemoHide flag="commandBarDevCopy">
            <ExecutiveCommandBar />
          </DemoHide>

          <DemoCommercialHeroFrame />

          <DemoHide flag="onboardingLead">
            {lead ? <div className="w-full">{lead}</div> : null}
          </DemoHide>

          {aboveLayout ? (
            <div
              className="w-full max-w-[96rem] space-y-6 xl:space-y-7"
              data-dashboard-resumo-vendas
              data-dashboard-version="dashboard-v2"
            >
              {aboveLayout}
            </div>
          ) : null}

          <ExecutiveLayoutManager
            tenantSlug={tenantSlug}
            bootstrap={layoutBootstrap}
          >
            {children}
          </ExecutiveLayoutManager>

          {footer}
        </ExecutiveDashboardShell>
      </div>
    </WorkspaceProvider>
  );
}
