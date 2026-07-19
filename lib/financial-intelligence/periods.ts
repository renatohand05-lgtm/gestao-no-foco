import {
  calcVariation,
  formatPeriodoLabel,
  parseISODate,
  toISODate,
} from "@/lib/dashboard/period";
import type { DashboardFilters, DashboardKpiComparison } from "@/types/dashboard-executive";
import type { DreFilters } from "@/types/dre";
import type { FiTone, FiTrendPresets } from "@/lib/financial-intelligence/types";

export function toDashboardFilters(filters: DreFilters): DashboardFilters {
  return {
    dataDe: filters.dataDe,
    dataAte: filters.dataAte,
    centroCusto: filters.centroCustoId,
    categoria: filters.categoriaId,
  };
}

export function toDreFiltersFromDashboard(filters: DashboardFilters): DreFilters {
  return {
    dataDe: filters.dataDe,
    dataAte: filters.dataAte,
    centroCustoId: filters.centroCusto,
    categoriaId: filters.categoria,
  };
}

export function compareMetric(
  current: number,
  previous: number,
): DashboardKpiComparison {
  const { variationPct, trend } = calcVariation(current, previous);
  return { current, previous, variationPct, trend };
}

/** Tom automático: despesas/custos invertidos (queda = positivo). */
export function toneForMetric(
  key: string,
  trend: DashboardKpiComparison["trend"],
  value: number,
): FiTone {
  const costLike =
    key.includes("cmv") ||
    key.includes("despesa") ||
    key === "break_even";

  if (trend === "neutral") {
    if (value < 0 && !costLike) return "negative";
    return "neutral";
  }

  if (costLike) {
    if (trend === "down") return "positive";
    if (trend === "up") return "warning";
    return "neutral";
  }

  if (trend === "up") return value >= 0 ? "positive" : "warning";
  if (trend === "down") return "negative";
  return "neutral";
}

export function buildTrendPresets(now = new Date()): FiTrendPresets {
  const today = toISODate(now);

  const d7Start = new Date(now);
  d7Start.setDate(d7Start.getDate() - 6);

  const d30Start = new Date(now);
  d30Start.setDate(d30Start.getDate() - 29);

  const m12Start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const m12End = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const yoyCurrentDe = `${now.getFullYear()}-01-01`;
  const yoyPreviousDe = `${now.getFullYear() - 1}-01-01`;
  const yoyPreviousAte = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return {
    d7: {
      dataDe: toISODate(d7Start),
      dataAte: today,
      label: formatPeriodoLabel(toISODate(d7Start), today),
    },
    d30: {
      dataDe: toISODate(d30Start),
      dataAte: today,
      label: formatPeriodoLabel(toISODate(d30Start), today),
    },
    m12: {
      dataDe: toISODate(m12Start),
      dataAte: toISODate(m12End),
      label: "Últimos 12 meses",
    },
    yoyCurrent: {
      dataDe: yoyCurrentDe,
      dataAte: today,
      label: `Ano ${now.getFullYear()} (YTD)`,
    },
    yoyPrevious: {
      dataDe: yoyPreviousDe,
      dataAte: yoyPreviousAte,
      label: `Ano ${now.getFullYear() - 1} (mesmo período)`,
    },
  };
}

export function eachCalendarMonth(dataDe: string, dataAte: string): DashboardFilters[] {
  const start = parseISODate(dataDe);
  const end = parseISODate(dataAte);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const months: DashboardFilters[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= last) {
    const de = toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    const ate = toISODate(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    months.push({ dataDe: de, dataAte: ate });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}
