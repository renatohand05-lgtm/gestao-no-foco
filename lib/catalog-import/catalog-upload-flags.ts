/**
 * Sprint 25.4.1 — Flags da Central de Importação (catálogo / estoque / NF / PDF).
 *
 * Excel, CSV, catálogo e NF-e XML são capacidades CORE: default ON.
 * OCR permanece OFF. PDF pesquisável ON somente se extrator textual ativo.
 */

function envFlag(name: string, defaultOn: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultOn;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  return defaultOn;
}

export function isCatalogImportEnabled(): boolean {
  return envFlag("IMPORT_CATALOG_ENABLED", true);
}

export function isStockExcelImportEnabled(): boolean {
  return envFlag("IMPORT_STOCK_EXCEL_ENABLED", true);
}

export function isStockCsvImportEnabled(): boolean {
  return envFlag("IMPORT_STOCK_CSV_ENABLED", true);
}

export function isNfeXmlImportEnabled(): boolean {
  return envFlag("IMPORT_NFE_XML_ENABLED", true);
}

/** PDF com texto selecionável — extrator sem OCR. */
export function isPdfSearchableImportEnabled(): boolean {
  return envFlag("IMPORT_PDF_SEARCHABLE_ENABLED", true);
}

/** OCR de PDF imagem — desligado nesta sprint. */
export function isPdfOcrImportEnabled(): boolean {
  return envFlag("IMPORT_OCR_ENABLED", false);
}

export function assertCatalogImportFeatureEnabled(): void {
  if (!isCatalogImportEnabled()) {
    throw new Error(
      "Importação de catálogo desativada (IMPORT_CATALOG_ENABLED=0).",
    );
  }
}

export function assertStockSpreadsheetImportEnabled(format: string): void {
  const f = format.toLowerCase();
  if ((f === "csv" || f.endsWith(".csv")) && !isStockCsvImportEnabled()) {
    throw new Error(
      "Importação CSV de estoque desativada (IMPORT_STOCK_CSV_ENABLED=0).",
    );
  }
  if (
    (f === "xlsx" ||
      f === "xls" ||
      f.endsWith(".xlsx") ||
      f.endsWith(".xls")) &&
    !isStockExcelImportEnabled()
  ) {
    throw new Error(
      "Importação Excel de estoque desativada (IMPORT_STOCK_EXCEL_ENABLED=0).",
    );
  }
}

export function assertNfeXmlImportEnabled(): void {
  if (!isNfeXmlImportEnabled()) {
    throw new Error(
      "Importação de NF-e XML desativada (IMPORT_NFE_XML_ENABLED=0).",
    );
  }
}
