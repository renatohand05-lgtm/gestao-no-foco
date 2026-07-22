import { Suspense } from "react";

import {
  DashboardExecutiveLoading,
  DashboardStreamingView,
  type DashboardStreamCtx,
  type ResumoMesUiFilters,
} from "@/components/dashboard/dashboard-streaming";
import { DashboardOnboardingLead } from "@/components/onboarding/dashboard-onboarding-lead";
import { getCurrentProfile } from "@/lib/auth/session";
import { defaultDashboardPeriodo } from "@/lib/dashboard/dashboard-service";
import { fetchDashboardFilterOptions } from "@/lib/dashboard/filter-options";
import { getGreeting } from "@/lib/dashboard/format";
import {
  civilDateInTimezone,
  resolveTenantTimezone,
} from "@/lib/dashboard/tenant-timezone";
import { bootstrapDashboardLayoutSafe } from "@/lib/dashboard-layout/persistence/layout-service";
import { requireTenant } from "@/lib/tenants";
import type { DashboardFilters } from "@/types/dashboard-executive";
import type { FluxoCaixaStatusFilter } from "@/types/fluxo-caixa";

export const metadata = {
  title: "Dashboard",
};

/** Dashboard autenticado — sempre fresco após deploy (sem ISR/estático legado). */
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    dataDe?: string;
    dataAte?: string;
    centroCusto?: string;
    categoria?: string;
    conta?: string;
    status?: string;
    resumoAno?: string;
    resumoMes?: string;
    resumoUnidade?: string;
    resumoVendedor?: string;
    resumoOrigem?: string;
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

function resolveResumoFilters(
  searchParams: PageProps["searchParams"] extends Promise<infer T> ? T : never,
): ResumoMesUiFilters {
  const hoje = civilDateInTimezone(new Date(), resolveTenantTimezone());
  const defaultYear = Number(hoje.slice(0, 4));
  const defaultMonth = Number(hoje.slice(5, 7));

  const yearRaw = Number(searchParams.resumoAno);
  const monthRaw = Number(searchParams.resumoMes);
  const year =
    Number.isFinite(yearRaw) && yearRaw >= 2000 && yearRaw <= 2100
      ? yearRaw
      : defaultYear;
  const month =
    Number.isFinite(monthRaw) && monthRaw >= 1 && monthRaw <= 12
      ? monthRaw
      : defaultMonth;

  return {
    year,
    month,
    centroCustoId: searchParams.resumoUnidade || undefined,
    vendedorId: searchParams.resumoVendedor || undefined,
    origem: searchParams.resumoOrigem || undefined,
  };
}

async function DashboardStreamingRoot({
  tenantSlug,
  filters,
  resumoFilters,
}: {
  tenantSlug: string;
  filters: DashboardFilters;
  resumoFilters: ResumoMesUiFilters;
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

  // Diagnóstico de versão (somente servidor) — confirma código novo em produção.
  console.info("[dashboard-v2]", {
    tenant: tenantSlug,
    sha:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
      "local",
    layoutSource: layoutBootstrap?.source ?? "none",
  });

  const ctx: DashboardStreamCtx = {
    tenantId: tenant.id,
    tenantSlug,
    tenantName: tenant.name,
    segment: tenant.segment,
    filters,
    greeting,
    filterOptions: options,
    resumoFilters,
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
  const resumoFilters = resolveResumoFilters(resolvedSearchParams);

  return (
    <Suspense fallback={<DashboardExecutiveLoading />}>
      <DashboardStreamingRoot
        tenantSlug={tenantSlug}
        filters={filters}
        resumoFilters={resumoFilters}
      />
    </Suspense>
  );
}
