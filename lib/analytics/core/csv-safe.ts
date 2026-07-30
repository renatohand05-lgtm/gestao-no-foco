/**
 * Sprint 23.1 — Escape CSV (injection + encoding).
 */

/** Prefixa fórmulas perigosas; escapa aspas/vírgulas/quebras. */
export function csvEscapeCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (s.length === 0) return "";
  // CSV / formula injection (Excel, Sheets)
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildAnalyticsCsv(
  rows: Array<Record<string, unknown>>,
  columns: string[],
): string {
  const header = columns.map(csvEscapeCell).join(",");
  const body = rows
    .map((row) => columns.map((c) => csvEscapeCell(row[c])).join(","))
    .join("\n");
  // BOM UTF-8 para Excel
  return `\uFEFF${header}\n${body}\n`;
}
