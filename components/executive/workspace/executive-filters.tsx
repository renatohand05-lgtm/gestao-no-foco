"use client";

import {
  DashboardFilterPersistence,
  DashboardFiltersBar,
} from "@/components/dashboard/dashboard-filters";
import { gofCardSurface, gofMotion } from "@/lib/design-system";
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
 * Toolbar de filtros — DS oficial (Gate 19.4.1).
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
        "overflow-x-hidden px-4 py-3 sm:px-5",
        gofCardSurface,
        gofMotion.fade,
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
