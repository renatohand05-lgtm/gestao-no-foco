"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { CalendarDays } from "lucide-react";

import {
  DashboardFilterPersistence,
  DashboardFiltersBar,
} from "@/components/dashboard/dashboard-filters";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  parseDashboardSearchParams,
  writeStoredDashboardFilters,
} from "@/lib/dashboard/filter-storage";
import { formatPeriodoLabel } from "@/lib/dashboard/period";
import { dsControl } from "@/lib/design-system";
import type {
  DashboardFilterOptions,
  DashboardFilters,
} from "@/types/dashboard-executive";

type DashboardPeriodFilterProps = {
  tenantSlug: string;
  filters: DashboardFilters;
};

function DashboardPeriodFilter({
  tenantSlug,
  filters,
}: DashboardPeriodFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const nextFilters = parseDashboardSearchParams(params, {
      dataDe: filters.dataDe,
      dataAte: filters.dataAte,
    });
    writeStoredDashboardFilters(nextFilters);

    startTransition(() => {
      const queryString = params.toString();
      router.push(
        queryString
          ? `/${tenantSlug}/dashboard?${queryString}`
          : `/${tenantSlug}/dashboard`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="space-y-1.5">
        <label
          htmlFor="dashboard-data-de"
          className="text-xs font-medium text-muted-foreground"
        >
          Período de
        </label>
        <input
          id="dashboard-data-de"
          type="date"
          value={filters.dataDe}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ dataDe: event.target.value || null })
          }
          className={dsControl}
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="dashboard-data-ate"
          className="text-xs font-medium text-muted-foreground"
        >
          Período até
        </label>
        <input
          id="dashboard-data-ate"
          type="date"
          value={filters.dataAte}
          disabled={isPending}
          onChange={(event) =>
            updateParams({ dataAte: event.target.value || null })
          }
          className={dsControl}
        />
      </div>
      {isPending ? (
        <p
          className="inline-flex h-9 items-center rounded-md border border-border/60 bg-muted/40 px-3 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Atualizando…
        </p>
      ) : null}
    </div>
  );
}

type DashboardHeaderProps = {
  greeting: string;
  subtitle: string;
  tenantSlug: string;
  filters: DashboardFilters;
  filterOptions: DashboardFilterOptions;
  exportActions: ReactNode;
};

export function DashboardHeader({
  greeting,
  subtitle,
  tenantSlug,
  filters,
  filterOptions,
  exportActions,
}: DashboardHeaderProps) {
  const periodoLabel = formatPeriodoLabel(filters.dataDe, filters.dataAte);

  return (
    <>
      <DashboardFilterPersistence
        tenantSlug={tenantSlug}
        defaults={{ dataDe: filters.dataDe, dataAte: filters.dataAte }}
      />
      <PageHeader
        title={greeting}
        description={subtitle}
        actionsClassName="w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end"
      >
        <div className="flex w-full flex-col gap-3 sm:items-end">
          {exportActions}
          <Badge
            variant="secondary"
            className="w-fit gap-1.5 px-3 py-1.5 text-xs font-normal capitalize"
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {periodoLabel}
          </Badge>
        </div>
        <DashboardPeriodFilter tenantSlug={tenantSlug} filters={filters} />
        <DashboardFiltersBar
          tenantSlug={tenantSlug}
          filters={filters}
          filterOptions={filterOptions}
        />
      </PageHeader>
    </>
  );
}

export function DashboardHeaderSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando cabeçalho">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-muted/50" />
      <div className="h-5 w-96 max-w-full animate-pulse rounded bg-muted/40" />
      <div className="flex gap-3">
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted/40" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted/40" />
      </div>
    </div>
  );
}
