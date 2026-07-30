import type { ImportFormat } from "../types/index.ts";

const EXT_MAP: Record<string, ImportFormat> = {
  ".csv": "csv",
  ".xlsx": "xlsx",
  ".xls": "xls",
  ".pdf": "pdf",
  ".ofx": "ofx",
  ".xml": "xml",
  ".ret": "cnab",
  ".rem": "cnab",
};

export function detectFormatFromFileName(fileName: string): ImportFormat {
  const lower = fileName.trim().toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return "unknown";
  return EXT_MAP[lower.slice(dot)] ?? "unknown";
}

export function detectFormatFromMime(
  mime: string | null | undefined,
  fileName: string,
): ImportFormat {
  const m = (mime ?? "").toLowerCase();
  if (m.includes("csv") || m === "text/plain") {
    const byName = detectFormatFromFileName(fileName);
    return byName === "unknown" ? "csv" : byName;
  }
  if (
    m.includes("spreadsheetml") ||
    m.includes("openxmlformats") ||
    m.includes("xlsx")
  ) {
    return "xlsx";
  }
  if (m.includes("excel") || m.includes("xls")) {
    const byName = detectFormatFromFileName(fileName);
    return byName === "xls" ? "xls" : byName === "xlsx" ? "xlsx" : "xls";
  }
  return detectFormatFromFileName(fileName);
}

export function assertSupportedFormat(format: ImportFormat): void {
  if (
    format === "csv" ||
    format === "xlsx" ||
    format === "xls" ||
    format === "pdf" ||
    format === "ofx" ||
    format === "xml"
  ) {
    return;
  }
  if (format === "cnab") {
    throw new Error(
      "Importação CNAB (240/400) está em preparação — use CSV, Excel ou OFX nesta fase.",
    );
  }
  throw new Error(
    "Formato de arquivo não reconhecido. Envie .xlsx, .xls, .csv, .pdf, .ofx ou .xml.",
  );
}
