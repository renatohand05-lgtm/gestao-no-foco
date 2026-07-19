"use client";

import {
  DashboardFilterPersistence,
  DashboardFiltersBar,
} from "@/components/dashboard/dashboard-filters";
import { exAnimations, exShadow } from "@/lib/design-system";
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
 * Toolbar premium de filtros (Sprint 12.3) — linha única, sem formulário.
 */
export function ExecutiveFilters({
  tenantSlug,
  tenantName,
  filters,
  filterOptions,
}: Props) {
  const competencia = filters.dataDe.slice(0, 7);

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/60 bg-white px-4 py-3 sm:px-5",
        "dark:border-white/10 dark:bg-card",
        exShadow.toolbar,
        exAnimations.fade,
      )}
      aria-label="Filtros do workspace"
    >
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
          { label: "Competência", value: competencia },
        ]}
      />
    </div>
  );
}
