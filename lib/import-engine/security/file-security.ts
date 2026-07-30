/**
 * Sprint 22.5.1 — Camada de segurança da Import Engine.
 *
 * Executa SEMPRE antes do parsing (parsers/index.ts chama isto primeiro).
 * Cobre: whitelist de extensão, MIME vs extensão, assinatura/magic bytes,
 * limites de tamanho, bloqueio de executáveis, heurística de macros em
 * planilhas Office (zip) e aviso de encoding.
 *
 * Escaneamento de antivírus real (ClamAV etc.) NÃO é implementado aqui —
 * ver security/antivirus.ts para a interface e o placeholder no-op.
 */
import type {
  ImportFileLimits,
  ImportFormat,
  ImportSecurityIssue,
  ImportSecurityResult,
} from "../types/index.ts";
import { DEFAULT_IMPORT_LIMITS } from "../types/index.ts";

export type ValidateImportFileSecurityInput = {
  fileName: string;
  mimeType?: string | null;
  bytes: Buffer | ArrayBuffer | Uint8Array;
  limits?: Partial<ImportFileLimits>;
};

/** Extensões aceitas para processamento nesta fase. */
const PROCESSABLE_EXTENSIONS = new Set([
  ".csv",
  ".xlsx",
  ".xls",
  ".pdf",
  ".ofx",
  ".xml",
]);

/** Formatos previstos na arquitetura, mas ainda sem parser (mensagem amigável). */
const PLANNED_NOT_SUPPORTED_EXTENSIONS = new Set([".ret", ".rem", ".cnab"]);

/** Extensões de executáveis/scripts — sempre rejeitadas. */
const EXECUTABLE_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".ps1",
  ".js",
  ".vbs",
  ".scr",
  ".msi",
  ".com",
  ".jar",
]);

function getExtension(fileName: string): string {
  const lower = fileName.trim().toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot < 0 ? "" : lower.slice(dot);
}

function toUint8Array(bytes: Buffer | ArrayBuffer | Uint8Array): Uint8Array {
  if (Buffer.isBuffer(bytes)) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  return bytes;
}

function byteLength(bytes: Buffer | ArrayBuffer | Uint8Array): number {
  if (Buffer.isBuffer(bytes)) return bytes.length;
  if (bytes instanceof ArrayBuffer) return bytes.byteLength;
  return bytes.byteLength;
}

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  if (bytes.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (bytes[i] !== sig[i]) return false;
  }
  return true;
}

/** Procura uma sub-sequência ASCII dentro dos primeiros N bytes (heurística — sem parsing completo de zip). */
function containsAsciiNeedle(
  bytes: Uint8Array,
  needle: string,
  scanLimit = 5 * 1024 * 1024,
): boolean {
  const limit = Math.min(bytes.length, scanLimit);
  const needleBytes = Array.from(needle).map((c) => c.charCodeAt(0));
  const n = needleBytes.length;
  if (n === 0 || limit < n) return false;
  outer: for (let i = 0; i <= limit - n; i++) {
    for (let j = 0; j < n; j++) {
      if (bytes[i + j] !== needleBytes[j]) continue outer;
    }
    return true;
  }
  return false;
}

function isZipSignature(bytes: Uint8Array): boolean {
  // PK\x03\x04 (local file header) ou PK\x05\x06 (empty archive)
  return (
    startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])
  );
}

function isOleSignature(bytes: Uint8Array): boolean {
  // Compound File Binary (xls antigo, doc, etc.)
  return startsWith(bytes, [
    0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
  ]);
}

function isPeExecutableSignature(bytes: Uint8Array): boolean {
  // "MZ" header dos executáveis DOS/PE do Windows.
  return bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a;
}

function isPdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  const head = Buffer.from(bytes.subarray(0, 5)).toString("latin1");
  return head.startsWith("%PDF-");
}

function looksLikeOfxText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 8192));
  const text = Buffer.from(sample).toString("utf8").toUpperCase();
  return (
    text.includes("OFXHEADER") ||
    text.includes("<OFX>") ||
    text.includes("<STMTTRN>") ||
    text.includes("BANKID")
  );
}

function looksLikeXmlText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  const text = Buffer.from(sample).toString("utf8").trimStart();
  return text.startsWith("<?xml") || /^<[A-Za-z_][\w.-]*/.test(text);
}

function looksLikeCsvText(bytes: Uint8Array): boolean {
  // Heurística simples: primeiros bytes majoritariamente imprimíveis/whitespace.
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  if (sample.length === 0) return false;
  let printable = 0;
  for (const b of sample) {
    if (
      b === 0x09 ||
      b === 0x0a ||
      b === 0x0d ||
      (b >= 0x20 && b <= 0x7e) ||
      b >= 0x80 // permite acentuação/latin1/utf8 multibyte
    ) {
      printable += 1;
    }
  }
  return printable / sample.length > 0.85;
}

function hasUtf8Bom(bytes: Uint8Array): boolean {
  return bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}

function mimeMatchesExtension(mime: string, ext: string): boolean {
  const m = mime.toLowerCase();
  if (ext === ".csv") {
    return (
      m === "" ||
      m.includes("csv") ||
      m === "text/plain" ||
      m === "application/vnd.ms-excel" // Excel às vezes anuncia CSV como isso
    );
  }
  if (ext === ".xlsx") {
    return (
      m === "" ||
      m.includes("spreadsheetml") ||
      m.includes("openxmlformats") ||
      m === "application/octet-stream" ||
      m === "application/zip"
    );
  }
  if (ext === ".xls") {
    return (
      m === "" ||
      m.includes("excel") ||
      m.includes("ms-excel") ||
      m === "application/octet-stream"
    );
  }
  if (ext === ".pdf") {
    return m === "" || m.includes("pdf") || m === "application/octet-stream";
  }
  if (ext === ".ofx") {
    return (
      m === "" ||
      m.includes("ofx") ||
      m.includes("x-ofx") ||
      m === "application/octet-stream" ||
      m === "text/plain"
    );
  }
  if (ext === ".xml") {
    return (
      m === "" ||
      m.includes("xml") ||
      m === "application/octet-stream" ||
      m === "text/plain"
    );
  }
  return true;
}

function extToFormat(ext: string): ImportFormat {
  if (ext === ".csv") return "csv";
  if (ext === ".xlsx") return "xlsx";
  if (ext === ".xls") return "xls";
  if (ext === ".pdf") return "pdf";
  if (ext === ".ofx") return "ofx";
  if (ext === ".xml") return "xml";
  if (ext === ".ret" || ext === ".rem" || ext === ".cnab") return "cnab";
  return "unknown";
}

/**
 * Validação de segurança do arquivo de importação.
 * NÃO lança — devolve um relatório. Use `assertImportFileSecurity` para
 * transformar erros em exceção amigável (usado pelo parser).
 */
export function validateImportFileSecurity(
  input: ValidateImportFileSecurityInput,
): ImportSecurityResult {
  const limits = { ...DEFAULT_IMPORT_LIMITS, ...input.limits };
  const issues: ImportSecurityIssue[] = [];
  const warnings: string[] = [];
  const ext = getExtension(input.fileName);
  const format = extToFormat(ext);
  const bytes = toUint8Array(input.bytes);
  const size = byteLength(input.bytes);

  if (EXECUTABLE_EXTENSIONS.has(ext)) {
    issues.push({
      code: "executable_extension",
      severity: "error",
      message: `Arquivos do tipo ${ext} não são permitidos por motivos de segurança.`,
    });
  }

  if (isPeExecutableSignature(bytes)) {
    issues.push({
      code: "executable_signature",
      severity: "error",
      message:
        "O conteúdo do arquivo corresponde a um executável (assinatura MZ/PE) e foi bloqueado.",
    });
  }

  if (size <= 0) {
    issues.push({
      code: "empty_file",
      severity: "error",
      message: "Arquivo vazio.",
    });
  } else if (size > limits.maxBytes) {
    issues.push({
      code: "size_limit_exceeded",
      severity: "error",
      message: `Arquivo excede o limite de ${(limits.maxBytes / (1024 * 1024)).toFixed(0)} MB.`,
    });
  }

  if (!PROCESSABLE_EXTENSIONS.has(ext) && !EXECUTABLE_EXTENSIONS.has(ext)) {
    if (PLANNED_NOT_SUPPORTED_EXTENSIONS.has(ext)) {
      issues.push({
        code: "format_not_supported_yet",
        severity: "error",
        message:
          ext === ".ret" || ext === ".rem" || ext === ".cnab"
            ? "Importação CNAB (240/400) está em preparação — use CSV, Excel ou OFX nesta fase."
            : `Formato ${ext.replace(".", "").toUpperCase()} está previsto na arquitetura, mas ainda não é suportado. Use Excel ou CSV.`,
      });
    } else {
      issues.push({
        code: "extension_not_allowed",
        severity: "error",
        message:
          "Extensão de arquivo não reconhecida. Envie um arquivo .xlsx, .xls ou .csv.",
      });
    }
  }

  if (
    PROCESSABLE_EXTENSIONS.has(ext) &&
    input.mimeType &&
    !mimeMatchesExtension(input.mimeType, ext)
  ) {
    warnings.push(
      `Tipo MIME "${input.mimeType}" não corresponde ao esperado para ${ext} — prosseguindo com verificação por assinatura.`,
    );
  }

  // Assinatura (magic bytes) — só faz sentido quando o tamanho é suficiente.
  if (PROCESSABLE_EXTENSIONS.has(ext) && bytes.length > 0) {
    if (ext === ".xlsx") {
      if (!isZipSignature(bytes)) {
        issues.push({
          code: "signature_mismatch",
          severity: "error",
          message:
            "O conteúdo não corresponde a um arquivo .xlsx válido (assinatura ZIP ausente).",
        });
      } else {
        if (
          containsAsciiNeedle(bytes, "vbaProject.bin") ||
          containsAsciiNeedle(bytes, "xl/macrosheets/")
        ) {
          issues.push({
            code: "macro_detected",
            severity: "error",
            message:
              "A planilha contém macros (VBA) ou macrosheets — arquivos com macro são bloqueados por segurança. Salve como .xlsx sem macros (ou .csv) e tente novamente.",
          });
        }
      }
    } else if (ext === ".xls") {
      if (!isOleSignature(bytes) && !isZipSignature(bytes)) {
        issues.push({
          code: "signature_mismatch",
          severity: "error",
          message:
            "O conteúdo não corresponde a um arquivo .xls válido (assinatura OLE ausente).",
        });
      }
    } else if (ext === ".csv") {
      if (!looksLikeCsvText(bytes)) {
        issues.push({
          code: "signature_mismatch",
          severity: "error",
          message:
            "O conteúdo não parece ser um CSV de texto — verifique se o arquivo não está corrompido ou é binário.",
        });
      }
      if (!hasUtf8Bom(bytes)) {
        warnings.push(
          "CSV sem BOM UTF-8 detectado — se houver caracteres acentuados incorretos, salve o arquivo como UTF-8 ou Latin-1 (ISO-8859-1).",
        );
      }
    } else if (ext === ".pdf") {
      if (!isPdfSignature(bytes)) {
        issues.push({
          code: "signature_mismatch",
          severity: "error",
          message:
            "Assinatura PDF inválida — o arquivo deve iniciar com %PDF-.",
        });
      }
    } else if (ext === ".ofx") {
      if (!looksLikeOfxText(bytes)) {
        issues.push({
          code: "signature_mismatch",
          severity: "error",
          message:
            "O conteúdo não parece ser um arquivo OFX válido — verifique o extrato bancário.",
        });
      }
    } else if (ext === ".xml") {
      if (!looksLikeXmlText(bytes)) {
        issues.push({
          code: "signature_mismatch",
          severity: "error",
          message:
            "O conteúdo não parece ser XML de texto — verifique se o arquivo não está corrompido.",
        });
      }
    }
  }

  return {
    safe: issues.every((i) => i.severity !== "error"),
    issues,
    warnings,
    detectedFormat: format,
  };
}

/** Versão que lança no primeiro erro — usada pelo pipeline de parsing. */
export function assertImportFileSecurity(
  input: ValidateImportFileSecurityInput,
): ImportSecurityResult {
  const result = validateImportFileSecurity(input);
  const firstError = result.issues.find((i) => i.severity === "error");
  if (firstError) {
    throw new Error(firstError.message);
  }
  return result;
}
