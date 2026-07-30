import type { ImportFileLimits, ImportFormat, ImportParseResult } from "../types/index.ts";
import { DEFAULT_IMPORT_LIMITS } from "../types/index.ts";
import { assertImportFileSecurity } from "../security/file-security.ts";
import {
  assertSupportedFormat,
  detectFormatFromMime,
} from "./detect-format.ts";
import { parseCsvBuffer } from "./csv-parser.ts";
import { parseExcelBuffer } from "./excel-parser.ts";
import { parsePdfBuffer } from "./pdf-parser.ts";
import { parseOfxBuffer } from "./ofx-parser.ts";
import { parseFinanceXmlBuffer } from "./xml-finance-parser.ts";

export type ParseFileInput = {
  fileName: string;
  mimeType?: string | null;
  bytes: Buffer | ArrayBuffer | Uint8Array;
  limits?: Partial<ImportFileLimits>;
};

export function parseImportFile(input: ParseFileInput): ImportParseResult {
  const limits = { ...DEFAULT_IMPORT_LIMITS, ...input.limits };

  // Segurança SEMPRE roda antes do parsing (extensão, MIME, assinatura,
  // executáveis, macros, tamanho). Ver lib/import-engine/security/.
  const security = assertImportFileSecurity({
    fileName: input.fileName,
    mimeType: input.mimeType,
    bytes: input.bytes,
    limits,
  });

  const format = detectFormatFromMime(input.mimeType, input.fileName);
  assertSupportedFormat(format);

  let result: ImportParseResult;
  if (format === "csv") {
    result = parseCsvBuffer(input.bytes, input.fileName);
  } else if (format === "pdf") {
    result = parsePdfBuffer(input.bytes, input.fileName);
  } else if (format === "ofx") {
    result = parseOfxBuffer(input.bytes, input.fileName);
  } else if (format === "xml") {
    result = parseFinanceXmlBuffer(input.bytes, input.fileName);
  } else {
    result = parseExcelBuffer(
      input.bytes,
      input.fileName,
      format as "xlsx" | "xls",
    );
  }

  if (result.totalRows > limits.maxRows) {
    throw new Error(
      `Arquivo com ${result.totalRows} linhas excede o limite de ${limits.maxRows.toLocaleString("pt-BR")} linhas.`,
    );
  }

  if (result.totalRows === 0) {
    throw new Error("Nenhuma linha de dados encontrada após remover vazias.");
  }

  if (security.warnings.length) {
    result.warnings = [...result.warnings, ...security.warnings];
  }

  return result;
}

export function supportedExtensions(): string[] {
  return [".csv", ".xlsx", ".xls", ".pdf", ".ofx", ".xml"];
}

export type { ImportFormat };
