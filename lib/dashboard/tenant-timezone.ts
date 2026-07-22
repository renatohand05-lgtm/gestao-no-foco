/** Timezone padrão para tenants BR sem configuração explícita. */
export const DEFAULT_TENANT_TIMEZONE = "America/Sao_Paulo";

/**
 * Data civil (YYYY-MM-DD) no fuso do tenant.
 * Evita `toISOString().slice(0,10)` que usa UTC e desloca o dia perto da meia-noite.
 */
export function civilDateInTimezone(
  date: Date = new Date(),
  timeZone: string = DEFAULT_TENANT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Hora local HH:mm no fuso do tenant (para timestamps ISO). */
export function civilTimeInTimezone(
  date: Date | string,
  timeZone: string = DEFAULT_TENANT_TIMEZONE,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatDateTimeInTimezone(
  date: Date = new Date(),
  timeZone: string = DEFAULT_TENANT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

/** Soma/subtrai dias sobre uma data civil YYYY-MM-DD (meio-dia local neutro). */
export function shiftCivilDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Mesmo dia da semana na semana anterior (7 dias antes). */
export function sameWeekdayPreviousWeek(isoDate: string): string {
  return shiftCivilDate(isoDate, -7);
}

export function firstDayOfMonthCivil(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function resolveTenantTimezone(configured?: string | null): string {
  const tz = configured?.trim();
  if (!tz) return DEFAULT_TENANT_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TENANT_TIMEZONE;
  }
}
