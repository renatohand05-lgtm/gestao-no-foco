/**
 * Sprint 22.8 — Proteção contra CSV/formula injection.
 * Células que iniciam com =, +, -, @ podem ser interpretadas como fórmulas
 * por Excel/LibreOffice ao reabrir o arquivo exportado.
 */

const FORMULA_PREFIX_RE = /^[=+\-@]/;

export function detectCsvInjection(value: unknown): boolean {
  if (value == null) return false;
  const s = String(value).trim();
  if (!s) return false;
  return FORMULA_PREFIX_RE.test(s);
}

/**
 * Remove prefixos de fórmula perigosos para exibição segura.
 * Preserva o conteúdo semântico (ex.: "=SUM(A1)" → "SUM(A1)").
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value == null) return "";
  let s = String(value);
  if (detectCsvInjection(s)) {
    s = s.replace(FORMULA_PREFIX_RE, "");
  }
  return s.trim();
}

/**
 * Prefixa célula com apóstrofo para neutralizar fórmulas em exportações CSV.
 */
export function neutralizeCsvCellForExport(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (detectCsvInjection(s)) {
    return `'${s}`;
  }
  return s;
}
