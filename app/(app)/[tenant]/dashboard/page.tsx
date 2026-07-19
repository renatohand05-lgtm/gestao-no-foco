import { Suspense } from "react";

import {
  DashboardExecutiveLoading,
  DashboardStreamingView,
  type DashboardStreamCtx,
} from "@/components/dashboard/dashboard-streaming";
import { DashboardOnboardingLead } from "@/components/onboarding/dashboard-onboarding-lead";
import { getCurrentProfile } from "@/lib/auth/session";
import { defaultDashboardPeriodo } from "@/lib/dashboard/dashboard-service";
import { fetchDashboardFilterOptions } from "@/lib/dashboard/filter-options";
import { getGreeting } from "@/lib/dashboard/format";
import { bootstrapDashboardLayoutSafe } from "@/lib/dashboard-layout/persistence/layout-service";
import { requireTenant } from "@/lib/tenants";
import type { DashboardFilters } from "@/types/dashboard-executive";
import type { FluxoCaixaStatusFilter } from "@/types/fluxo-caixa";

export const metadata = {
  title: "Dashboard",
};

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    dataDe?: string;
    dataAte?: string;
    centroCusto?: string;
    categoria?: string;
    conta?: string;
    status?: string;
  }>;
};

function resolveStatus(status?: string): FluxoCaixaStatusFilter | undefined {
  if (status === "realizado" || status === "previsto" || status === "all") {
    return status;
  }
  return undefined;
}

function resolveDashboardFilters(
  searchParams: PageProps["searchParams"] extends Promise<infer T> ? T : never,
): DashboardFilters {
  const defaults = defaultDashboardPeriodo();

  return {
    dataDe: searchParams.dataDe ?? defaults.dataDe,
    dataAte: searchParams.dataAte ?? defaults.dataAte,
    centroCusto: searchParams.centroCusto || undefined,
    categoria: searchParams.categoria || undefined,
    contaBancaria: searchParams.conta || undefined,
    status: resolveStatus(searchParams.status),
  };
}

async function DashboardStreamingRoot({
  tenantSlug,
  filters,
}: {
  tenantSlug: string;
  filters: DashboardFilters;
}) {
  const tenant = await requireTenant(tenantSlug);
  const [profile, options] = await Promise.all([
    getCurrentProfile(),
    fetchDashboardFilterOptions(tenant.id),
  ]);

  const greeting = getGreeting(profile?.name);

  const layoutBootstrap = profile?.id
    ? await bootstrapDashboardLayoutSafe(tenant.id, profile.id)
    : null;

  const ctx: DashboardStreamCtx = {
    tenantId: tenant.id,
    tenantSlug,
    tenantName: tenant.name,
    segment: tenant.segment,
    filters,
    greeting,
    filterOptions: options,
  };

  return (
    <DashboardStreamingView
      ctx={ctx}
      layoutBootstrap={layoutBootstrap}
      onboardingLead={
        <Suspense fallback={null}>
          <DashboardOnboardingLead tenantSlug={tenantSlug} />
        </Suspense>
      }
    />
  );
}

export default async function DashboardPage({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const filters = resolveDashboardFilters(resolvedSearchParams);

  return (
    <Suspense fallback={<DashboardExecutiveLoading />}>
      <DashboardStreamingRoot tenantSlug={tenantSlug} filters={filters} />
    </Suspense>
  );
}
