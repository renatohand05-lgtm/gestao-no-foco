"use client";

import {
  DashboardFilterPersistence,
  DashboardFiltersBar,
} from "@/components/dashboard/dashboard-filters";
import { ExecutivePresetSelector } from "@/components/executive/layout/executive-preset-selector";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
  DashboardFilterOptions,
  DashboardFilters,
} from "@/types/dashboard-executive";

type Props = {
  tenantSlug: string;
  tenantName: string;
  filters: DashboardFilters;
  filterOptions: DashboardFilterOptions;
};

/**
 * Controles secundários — abaixo da narrativa principal (Sprint 13.2).
 */
export function ExecutiveFoldChrome({
  tenantSlug,
  tenantName,
  filters,
  filterOptions,
}: Props) {
  return (
    <div
      className={cn(
        "mt-2 space-y-4 border-t border-slate-200/50 pt-6 dark:border-white/10",
        exAnimations.fade,
      )}
      aria-label="Visão e filtros"
    >
      <ExecutivePresetSelector />
      <div>
        <p className={cn("mb-1.5", exTypography.label)}>Contexto</p>
        <div className="rounded-xl border border-slate-200/45 bg-white/90 px-2.5 py-2 dark:border-white/10 dark:bg-card/70">
          <DashboardFilterPersistence
            tenantSlug={tenantSlug}
            defaults={{
              dataDe: filters.dataDe,
              dataAte: filters.dataAte,
            }}
          />
          <DashboardFiltersBar
            tenantSlug={tenantSlug}
            filters={filters}
            filterOptions={filterOptions}
            contextPills={[
              { label: "Empresa", value: tenantName },
              { label: "Comp.", value: filters.dataDe.slice(0, 7) },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
