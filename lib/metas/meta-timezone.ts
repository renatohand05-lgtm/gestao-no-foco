/** Timezone da meta — puro (America/Sao_Paulo). */

export const META_DEFAULT_TIMEZONE = "America/Sao_Paulo";

export function civilDateInMetaTimezone(
  date: Date = new Date(),
  timeZone: string = META_DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function currentCompetenciaInTimezone(
  now: Date = new Date(),
  timeZone: string = META_DEFAULT_TIMEZONE,
): string {
  const civil = civilDateInMetaTimezone(now, timeZone);
  return `${civil.slice(0, 7)}-01`;
}
