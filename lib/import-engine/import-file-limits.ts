/**
 * Sprint 25.4.1 — Limites centralizados de upload da Import Engine.
 *
 * Configurável via env (MB). Valores iniciais seguros:
 * XML 10 · CSV 20 · Excel 25 · PDF 20.
 */

export type ImportFormatLimitKey = "xml" | "csv" | "xlsx" | "xls" | "pdf" | "default";

const MB = 1024 * 1024;

function readMbEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

/** Limites em MB (fonte única). */
export function getImportMaxFileSizeMb(): Readonly<
  Record<ImportFormatLimitKey, number>
> {
  const globalDefault = readMbEnv("IMPORT_MAX_FILE_SIZE_MB", 25);
  return {
    xml: readMbEnv("IMPORT_MAX_XML_MB", 10),
    csv: readMbEnv("IMPORT_MAX_CSV_MB", 20),
    xlsx: readMbEnv("IMPORT_MAX_EXCEL_MB", 25),
    xls: readMbEnv("IMPORT_MAX_EXCEL_MB", 25),
    pdf: readMbEnv("IMPORT_MAX_PDF_MB", 20),
    default: globalDefault,
  };
}

export function getImportMaxBytes(format: ImportFormatLimitKey): number {
  const mb = getImportMaxFileSizeMb();
  return Math.round((mb[format] ?? mb.default) * MB);
}

/** Maior limite conhecido — usado como teto genérico da engine. */
export function getImportAbsoluteMaxBytes(): number {
  const mb = getImportMaxFileSizeMb();
  return Math.round(Math.max(...Object.values(mb)) * MB);
}

export function detectImportFormatLimitKey(
  fileName: string,
): ImportFormatLimitKey {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith(".xml")) return "xml";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".xls")) return "xls";
  if (lower.endsWith(".pdf")) return "pdf";
  return "default";
}

export function formatBytesAsMb(bytes: number): string {
  const mb = bytes / MB;
  if (mb < 0.1) return mb.toFixed(2);
  if (mb < 10) return mb.toFixed(1);
  return String(Math.round(mb * 10) / 10);
}

/**
 * Mensagem canónica quando o arquivo excede o limite do formato.
 */
export function buildFileTooLargeMessage(input: {
  fileBytes: number;
  format: ImportFormatLimitKey;
}): string {
  const limitMb = getImportMaxFileSizeMb()[input.format];
  const fileMb = formatBytesAsMb(input.fileBytes);
  return `Este arquivo possui ${fileMb} MB. O limite permitido para este formato é ${limitMb} MB.`;
}

export function assertImportFileWithinLimit(input: {
  fileName: string;
  byteLength: number;
}): void {
  if (input.byteLength <= 0) {
    throw new Error("Arquivo vazio.");
  }
  const format = detectImportFormatLimitKey(input.fileName);
  const max = getImportMaxBytes(format);
  if (input.byteLength > max) {
    throw new Error(
      buildFileTooLargeMessage({ fileBytes: input.byteLength, format }),
    );
  }
}

/** Constantes estáveis para UI (sem ler env no client). */
export const IMPORT_LIMIT_MB_CLIENT_DEFAULTS = {
  xml: 10,
  csv: 20,
  xlsx: 25,
  xls: 25,
  pdf: 20,
  default: 25,
} as const;
