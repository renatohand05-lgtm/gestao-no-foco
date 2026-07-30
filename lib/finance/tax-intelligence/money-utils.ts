/**
 * Sprint 26.7 — Utilitários monetários (sem regras fiscais).
 */

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addMonths(dateOnly: string, months: number): string {
  const [y, m, d] = dateOnly.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

export function periodKey(dateOnly: string): string {
  return dateOnly.slice(0, 7);
}

export function safeRatio(num: number, den: number): number | null {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
}
