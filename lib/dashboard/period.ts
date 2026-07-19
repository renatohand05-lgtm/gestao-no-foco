import type { DashboardFilters } from "@/types/dashboard-executive";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Mês calendário atual — espelha `defaultDrePeriodo` sem importar o serviço financeiro. */
function defaultCalendarMonthPeriod(now = new Date()): {
  dataDe: string;
  dataAte: string;
} {
  const year = now.getFullYear();
  const month = now.getMonth();
  const dataDe = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dataAte = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  return { dataDe, dataAte };
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function formatPeriodoLabel(dataDe: string, dataAte: string): string {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const inicio = formatter.format(parseISODate(dataDe));
  const fim = formatter.format(parseISODate(dataAte));
  return `${inicio} — ${fim}`;
}

export function isCalendarMonthPeriod(
  filters: DashboardFilters,
  now = new Date(),
): boolean {
  const defaults = defaultCalendarMonthPeriod(now);
  return filters.dataDe === defaults.dataDe && filters.dataAte === defaults.dataAte;
}

/**
 * Período anterior equivalente:
 * - mês calendário atual → mês calendário anterior;
 * - intervalo personalizado → mesma duração imediatamente anterior.
 */
export function resolvePreviousPeriod(
  filters: DashboardFilters,
  now = new Date(),
): DashboardFilters {
  const start = parseISODate(filters.dataDe);
  const end = parseISODate(filters.dataAte);

  if (isCalendarMonthPeriod(filters, now)) {
    const prevMonthStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    const prevMonthEnd = new Date(start.getFullYear(), start.getMonth(), 0);
    return {
      dataDe: toISODate(prevMonthStart),
      dataAte: toISODate(prevMonthEnd),
    };
  }

  const durationDays = Math.round(
    (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  );
  const prevAte = new Date(start);
  prevAte.setDate(prevAte.getDate() - 1);
  const prevDe = new Date(prevAte);
  prevDe.setDate(prevDe.getDate() - durationDays);

  return {
    dataDe: toISODate(prevDe),
    dataAte: toISODate(prevAte),
  };
}

export function calcVariation(
  current: number,
  previous: number,
): {
  variationPct: number | null;
  trend: "up" | "down" | "neutral";
} {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return { variationPct: null, trend: "neutral" };
  }

  if (previous === 0) {
    if (current === 0) {
      return { variationPct: 0, trend: "neutral" };
    }
    return {
      variationPct: null,
      trend: current > 0 ? "up" : "down",
    };
  }

  const variationPct = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(variationPct)) {
    return { variationPct: null, trend: "neutral" };
  }

  if (Math.abs(variationPct) < 0.05) {
    return { variationPct: 0, trend: "neutral" };
  }

  return {
    variationPct,
    trend: variationPct > 0 ? "up" : "down",
  };
}

export function eachDateInclusive(dataDe: string, dataAte: string): string[] {
  const dates: string[] = [];
  const cursor = parseISODate(dataDe);
  const end = parseISODate(dataAte);

  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) {
    return dates;
  }

  while (cursor <= end) {
    dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

/** Divide o período em fatias semanais (máx. 12) para evolução de EBITDA. */
export function splitPeriodIntoBuckets(
  dataDe: string,
  dataAte: string,
  maxBuckets = 12,
): DashboardFilters[] {
  const dates = eachDateInclusive(dataDe, dataAte);
  if (dates.length === 0) return [];

  const bucketSize = Math.max(1, Math.ceil(dates.length / maxBuckets));
  const buckets: DashboardFilters[] = [];

  for (let i = 0; i < dates.length; i += bucketSize) {
    const slice = dates.slice(i, i + bucketSize);
    buckets.push({
      dataDe: slice[0]!,
      dataAte: slice[slice.length - 1]!,
    });
  }

  return buckets;
}
