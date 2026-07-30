/**
 * Fase 23 — Resolução de períodos (sem hardcode de metas).
 */

import type {
  AnalyticsDateRange,
  AnalyticsPeriodPreset,
  MetricFilter,
} from "./metric-types.ts";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(iso: string, days: number): string {
  const dt = parseISO(iso);
  dt.setUTCDate(dt.getUTCDate() + days);
  return toISO(dt);
}

export function todayUtc(now = new Date()): string {
  return toISO(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
  );
}

const LABELS: Record<AnalyticsPeriodPreset, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  week: "Semana corrente",
  month: "Mês corrente",
  quarter: "Trimestre corrente",
  semester: "Semestre corrente",
  year: "Ano corrente",
  last_7: "Últimos 7 dias",
  last_30: "Últimos 30 dias",
  last_90: "Últimos 90 dias",
  last_365: "Últimos 365 dias",
  custom: "Personalizado",
};

export function resolvePeriodPreset(
  preset: AnalyticsPeriodPreset,
  options?: { now?: Date; customFrom?: string; customTo?: string },
): AnalyticsDateRange {
  const now = options?.now ?? new Date();
  const today = todayUtc(now);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  if (preset === "custom") {
    const from = options?.customFrom ?? today;
    const to = options?.customTo ?? today;
    return { from, to, preset, label: LABELS.custom };
  }

  switch (preset) {
    case "today":
      return { from: today, to: today, preset, label: LABELS.today };
    case "yesterday": {
      const yday = addDays(today, -1);
      return { from: yday, to: yday, preset, label: LABELS.yesterday };
    }
    case "week": {
      const dow = now.getUTCDay();
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      const from = addDays(today, mondayOffset);
      return { from, to: today, preset, label: LABELS.week };
    }
    case "month": {
      const from = `${y}-${pad(m + 1)}-01`;
      return { from, to: today, preset, label: LABELS.month };
    }
    case "quarter": {
      const qStartMonth = Math.floor(m / 3) * 3;
      const from = `${y}-${pad(qStartMonth + 1)}-01`;
      return { from, to: today, preset, label: LABELS.quarter };
    }
    case "semester": {
      const sStart = m < 6 ? 0 : 6;
      const from = `${y}-${pad(sStart + 1)}-01`;
      return { from, to: today, preset, label: LABELS.semester };
    }
    case "year": {
      const from = `${y}-01-01`;
      return { from, to: today, preset, label: LABELS.year };
    }
    case "last_7":
      return {
        from: addDays(today, -6),
        to: today,
        preset,
        label: LABELS.last_7,
      };
    case "last_30":
      return {
        from: addDays(today, -29),
        to: today,
        preset,
        label: LABELS.last_30,
      };
    case "last_90":
      return {
        from: addDays(today, -89),
        to: today,
        preset,
        label: LABELS.last_90,
      };
    case "last_365":
      return {
        from: addDays(today, -364),
        to: today,
        preset,
        label: LABELS.last_365,
      };
    default:
      return { from: today, to: today, preset: "today", label: LABELS.today };
  }
}

/** Período imediatamente anterior com a mesma duração (dias inclusivos). */
export function previousPeriodOf(range: AnalyticsDateRange): AnalyticsDateRange {
  const from = parseISO(range.from);
  const to = parseISO(range.to);
  const days =
    Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const prevTo = addDays(range.from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  return {
    from: prevFrom,
    to: prevTo,
    preset: "custom",
    label: `Anterior a ${range.label}`,
  };
}

export function emptyFilter(
  period: AnalyticsDateRange = resolvePeriodPreset("last_30"),
) {
  return { period };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string | undefined | null): boolean {
  if (!value || !ISO_DATE.test(value)) return false;
  const dt = parseISO(value);
  return toISO(dt) === value;
}

/**
 * Sanitiza filtros vindos do client.
 * IDs de empresa/filial só entram se estiverem na lista autorizada do servidor.
 * Sem lista autorizada → dimensões sensíveis são ignoradas (não confiar no client).
 */
export function sanitizeMetricFilter(args: {
  period: AnalyticsDateRange;
  raw?: Partial<MetricFilter> | null;
  authorizedEmpresaIds?: readonly string[] | null;
  authorizedFilialIds?: readonly string[] | null;
}): MetricFilter {
  const raw = args.raw ?? {};
  const intersect = (
    requested: string[] | undefined,
    allowed: readonly string[] | null | undefined,
  ): string[] | undefined => {
    if (!requested?.length) return undefined;
    if (!allowed || allowed.length === 0) {
      // Sem allow-list server-side: ignora filtro manipulado pelo client
      return undefined;
    }
    const set = new Set(allowed);
    const out = requested.filter((id) => set.has(id));
    return out.length ? out : undefined;
  };

  return {
    period: args.period,
    empresaIds: intersect(raw.empresaIds, args.authorizedEmpresaIds),
    filialIds: intersect(raw.filialIds, args.authorizedFilialIds),
    centroCustoIds: undefined, // só via allow-list futura
    categoriaIds: undefined,
    unidadeIds: undefined,
    responsavelIds: undefined,
    produtoIds: undefined,
    servicoIds: undefined,
    clienteIds: undefined,
    fornecedorIds: undefined,
    canais: undefined,
    statuses: undefined,
  };
}

export function assertPeriodPreset(
  value: string | undefined,
): AnalyticsPeriodPreset {
  const allowed: AnalyticsPeriodPreset[] = [
    "today",
    "yesterday",
    "week",
    "month",
    "quarter",
    "semester",
    "year",
    "last_7",
    "last_30",
    "last_90",
    "last_365",
    "custom",
  ];
  if (value && (allowed as string[]).includes(value)) {
    return value as AnalyticsPeriodPreset;
  }
  return "last_30";
}
