import type { DashboardFilters } from "@/types/dashboard-executive";

const LEGACY_KEY = "gnf:dashboard-filters";

export function dashboardFiltersStorageKey(tenantSlug: string): string {
  const slug = tenantSlug.trim().toLowerCase() || "unknown";
  return `gnf:dashboard-filters:${slug}`;
}

/** @deprecated use dashboardFiltersStorageKey(tenantSlug) */
export const DASHBOARD_FILTERS_STORAGE_KEY = LEGACY_KEY;

export type StoredDashboardFilters = Partial<DashboardFilters>;

export function readStoredDashboardFilters(
  tenantSlug: string,
): StoredDashboardFilters | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(
      dashboardFiltersStorageKey(tenantSlug),
    );
    if (raw) return JSON.parse(raw) as StoredDashboardFilters;
    // Migração one-shot do legado sem slug (não reutilizar em outro tenant).
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (!legacy) return null;
    window.localStorage.removeItem(LEGACY_KEY);
    return null;
  } catch {
    return null;
  }
}

export function writeStoredDashboardFilters(
  tenantSlug: string,
  filters: DashboardFilters,
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      dashboardFiltersStorageKey(tenantSlug),
      JSON.stringify(filters),
    );
  } catch {
    // Ignore quota or privacy errors.
  }
}

export function buildDashboardSearchParams(
  filters: DashboardFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  params.set("dataDe", filters.dataDe);
  params.set("dataAte", filters.dataAte);

  if (filters.centroCusto) params.set("centroCusto", filters.centroCusto);
  if (filters.categoria) params.set("categoria", filters.categoria);
  if (filters.contaBancaria) params.set("conta", filters.contaBancaria);
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  return params;
}

export function parseDashboardSearchParams(
  searchParams: URLSearchParams,
  defaults: Pick<DashboardFilters, "dataDe" | "dataAte">,
): DashboardFilters {
  const status = searchParams.get("status");

  return {
    dataDe: searchParams.get("dataDe") ?? defaults.dataDe,
    dataAte: searchParams.get("dataAte") ?? defaults.dataAte,
    centroCusto: searchParams.get("centroCusto") ?? undefined,
    categoria: searchParams.get("categoria") ?? undefined,
    contaBancaria: searchParams.get("conta") ?? undefined,
    status:
      status === "realizado" || status === "previsto" || status === "all"
        ? status
        : undefined,
  };
}
