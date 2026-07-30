/**
 * Sprint 22.6.2 — helpers de data (UTC calendar, sem TZ flaky).
 */

export function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function addDays(dateOnly: string, days: number): string {
  const d = new Date(`${dateOnly}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${toDateOnly(from)}T12:00:00.000Z`).getTime();
  const b = new Date(`${toDateOnly(to)}T12:00:00.000Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function eachDay(from: string, to: string): string[] {
  const start = toDateOnly(from);
  const end = toDateOnly(to);
  if (end < start) return [];
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
