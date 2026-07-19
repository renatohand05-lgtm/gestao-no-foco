import type { DashboardFilters } from "@/types/dashboard-executive";

export const DASHBOARD_FILTERS_STORAGE_KEY = "gnf:dashboard-filters";

export type StoredDashboardFilters = Partial<DashboardFilters>;

export function readStoredDashboardFilters(): StoredDashboardFilters | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DASHBOARD_FILTERS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredDashboardFilters;
  } catch {
    return null;
  }
}

export function writeStoredDashboardFilters(filters: DashboardFilters) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      DASHBOARD_FILTERS_STORAGE_KEY,
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
