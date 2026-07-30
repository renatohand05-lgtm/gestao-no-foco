/**
 * Sprint 22.8 — Parser XML financeiro com proteção XXE.
 * Usa fast-xml-parser com entidades/DTD desabilitados + scan pré-parse.
 */
import { XMLParser } from "fast-xml-parser";

export type XmlFinanceParseOptions = {
  maxBytes?: number;
  rootHint?: string;
};

export type XmlFinanceParseResult = {
  root: unknown;
  rootName: string | null;
  warnings: string[];
};

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

/** Padrões XXE / entidade externa — bloqueados antes do parse. */
const XXE_BLOCK_PATTERNS: RegExp[] = [
  /<!DOCTYPE[\s\S]*?>/i,
  /<!ENTITY[\s\S]*?>/i,
  /SYSTEM\s+["']/i,
  /PUBLIC\s+["']/i,
];

export class XmlSecurityError extends Error {
  code = "xml_security" as const;

  constructor(message: string) {
    super(message);
    this.name = "XmlSecurityError";
  }
}

export class XmlStructureError extends Error {
  code = "xml_structure" as const;

  constructor(message: string) {
    super(message);
    this.name = "XmlStructureError";
  }
}

function toText(input: string | Buffer | ArrayBuffer | Uint8Array): string {
  if (typeof input === "string") return input;
  if (Buffer.isBuffer(input)) return input.toString("utf8");
  return Buffer.from(input instanceof ArrayBuffer ? new Uint8Array(input) : input).toString(
    "utf8",
  );
}

/** Bloqueia DOCTYPE/ENTITY/SYSTEM antes de passar ao parser. */
export function assertXmlSafeContent(text: string): void {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("<")) {
    throw new XmlStructureError(
      "Conteúdo XML inválido — o arquivo deve iniciar com uma tag ou declaração XML.",
    );
  }

  for (const pattern of XXE_BLOCK_PATTERNS) {
    if (pattern.test(text)) {
      if (/<!DOCTYPE|ENTITY|SYSTEM|PUBLIC/i.test(text)) {
        throw new XmlSecurityError(
          "XML bloqueado por segurança: DOCTYPE/ENTITY/SYSTEM detectados (proteção XXE).",
        );
      }
    }
  }
}

function createSafeParser(): XMLParser {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    processEntities: false,
    htmlEntities: false,
    ignoreDeclaration: true,
    ignorePiTags: true,
    trimValues: true,
    parseTagValue: true,
    parseAttributeValue: true,
    stopNodes: [],
  });
}

function flattenRoot(parsed: Record<string, unknown>): { root: unknown; rootName: string | null } {
  const keys = Object.keys(parsed);
  if (keys.length === 0) return { root: parsed, rootName: null };
  if (keys.length === 1) return { root: parsed[keys[0]], rootName: keys[0] };
  return { root: parsed, rootName: null };
}

/** Parse seguro de XML financeiro (NFe, OFX 2, etc.). */
export function parseFinanceXmlSafe(
  input: string | Buffer | ArrayBuffer | Uint8Array,
  options: XmlFinanceParseOptions = {},
): XmlFinanceParseResult {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const text = toText(input);

  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new XmlStructureError(
      `XML excede o limite de ${(maxBytes / (1024 * 1024)).toFixed(1)} MB.`,
    );
  }

  assertXmlSafeContent(text);

  const parser = createSafeParser();
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(text) as Record<string, unknown>;
  } catch (err) {
    throw new XmlStructureError(
      err instanceof Error ? err.message : "Falha ao interpretar XML.",
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new XmlStructureError("Estrutura XML inesperada — raiz vazia ou inválida.");
  }

  const { root, rootName } = flattenRoot(parsed);
  const warnings: string[] = [];

  if (options.rootHint && rootName && rootName.toLowerCase() !== options.rootHint.toLowerCase()) {
    warnings.push(`Raiz XML "${rootName}" difere do hint "${options.rootHint}".`);
  }

  return { root, rootName, warnings };
}

/** Converte XML genérico em linhas chave/valor de primeiro nível (sem inventar campos). */
export function xmlToFlatRows(
  input: string | Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
): {
  columns: { key: string; label: string; index: number; sampleValues: string[] }[];
  rows: import("../types/index.ts").ImportRawRow[];
  warnings: string[];
} {
  void fileName;
  const { root, warnings } = parseFinanceXmlSafe(input);

  if (root == null || typeof root !== "object") {
    throw new XmlStructureError("XML sem estrutura tabular reconhecível.");
  }

  const entries = Object.entries(root as Record<string, unknown>);
  if (entries.length === 0) {
    throw new XmlStructureError("XML vazio após parse.");
  }

  const row: import("../types/index.ts").ImportRawRow = {};
  for (const [key, value] of entries) {
    if (value == null) {
      row[key] = null;
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      row[key] = value;
    } else if (value instanceof Date) {
      row[key] = value;
    } else if (typeof value === "object") {
      row[key] = JSON.stringify(value);
    } else {
      row[key] = String(value);
    }
  }

  const columns = Object.keys(row).map((key, index) => ({
    key,
    label: key,
    index,
    sampleValues: [String(row[key] ?? "")].filter(Boolean),
  }));

  return { columns, rows: [row], warnings };
}

export function parseFinanceXmlBuffer(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
): import("../types/index.ts").ImportParseResult {
  const { columns, rows, warnings } = xmlToFlatRows(buffer, fileName);
  return {
    format: "xml",
    fileName,
    columns,
    rows,
    totalRows: rows.length,
    emptyRowsRemoved: 0,
    warnings,
  };
}
