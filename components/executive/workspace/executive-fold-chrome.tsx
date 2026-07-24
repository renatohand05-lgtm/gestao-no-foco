"use client";

import {
  DashboardFilterPersistence,
  DashboardFiltersBar,
} from "@/components/dashboard/dashboard-filters";
import { ExecutivePresetSelector } from "@/components/executive/layout/executive-preset-selector";
import {
  gofCardSurface,
  gofMotion,
  gofTypography,
} from "@/lib/design-system";
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
 * Controles secundários — DS oficial (Gate 19.4.1).
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
        "mt-2 space-y-4 overflow-x-hidden border-t border-border/50 pt-6",
        gofMotion.fade,
      )}
      aria-label="Visão e filtros"
    >
      <ExecutivePresetSelector />
      <div>
        <p
          className={cn(
            "mb-1.5 tracking-[0.12em] text-[var(--brand-gold)] uppercase",
            gofTypography.caption,
          )}
        >
          Contexto
        </p>
        <div className={cn("px-2.5 py-2", gofCardSurface)}>
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
