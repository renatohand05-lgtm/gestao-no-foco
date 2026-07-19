import type { DashboardFilters } from "@/types/dashboard-executive";
import type { DreFilters } from "@/types/dre";
import type { FluxoCaixaFilters } from "@/types/fluxo-caixa";

export function toDreFilters(filters: DashboardFilters): DreFilters {
  return {
    dataDe: filters.dataDe,
    dataAte: filters.dataAte,
    centroCustoId: filters.centroCusto,
    categoriaId: filters.categoria,
  };
}

export function toFluxoCaixaFilters(
  filters: DashboardFilters,
  statusOverride?: FluxoCaixaFilters["status"],
): FluxoCaixaFilters {
  return {
    dataDe: filters.dataDe,
    dataAte: filters.dataAte,
    centroCustoId: filters.centroCusto,
    categoriaId: filters.categoria,
    contaBancariaId: filters.contaBancaria,
    status: statusOverride ?? filters.status ?? "all",
  };
}
