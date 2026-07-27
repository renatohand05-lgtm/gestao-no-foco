/**
 * Sprint 21.6 — Mapeamento snake_case ↔ camelCase (determinístico).
 */

export function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function mapKeysSnakeToCamel<T = Record<string, unknown>>(
  row: Record<string, unknown> | null | undefined,
): T {
  if (!row || typeof row !== "object") return {} as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamelKey(k)] = v;
  }
  return out as T;
}

export function mapKeysCamelToSnake(
  row: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!row || typeof row !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[camelToSnakeKey(k)] = v;
  }
  return out;
}

export function nowIso(now?: string | Date): string {
  if (now instanceof Date) return now.toISOString();
  if (typeof now === "string" && now.trim()) {
    const d = new Date(now);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

export function newEntityId(prefix = "ent"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
