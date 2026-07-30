/**
 * Sprint 22.8 — Entrada via clipboard (colar tabela/CSV/JSON/texto).
 * Trata conteúdo como não confiável; aplica proteção CSV injection.
 */
import type { ImportColumn, ImportParseResult, ImportRawRow } from "../types/index.ts";
import { detectCsvInjection, sanitizeCsvCell } from "./csv-security.ts";
import { parseCsvBuffer } from "./csv-parser.ts";
import { isRowEmpty, normalizeHeader, normalizeText } from "./normalize.ts";

export type ClipboardInputKind = "table" | "csv" | "json" | "structured_text";

export type ClipboardPayload = {
  kind: ClipboardInputKind;
  content: string;
  fileName?: string;
};

function uniqueKeys(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h, i) => {
    const base = normalizeHeader(h) || `coluna_${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}_${n}`;
  });
}

function parseTableContent(content: string): ImportParseResult {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Conteúdo colado vazio.");
  }

  const delimiter = lines[0].includes("\t")
    ? "\t"
    : lines[0].includes("|")
      ? "|"
      : /\s{2,}/.test(lines[0])
        ? "spaces"
        : "\t";

  const splitLine = (line: string): string[] => {
    if (delimiter === "spaces") return line.split(/\s{2,}/).map((c) => c.trim());
    return line.split(delimiter).map((c) => c.trim());
  };

  const headerCells = splitLine(lines[0]);
  const keys = uniqueKeys(headerCells);
  const columns: ImportColumn[] = keys.map((key, index) => ({
    key,
    label: normalizeText(headerCells[index]) || key,
    index,
    sampleValues: [],
  }));

  const warnings: string[] = [];
  let injectionCount = 0;
  const rows: ImportRawRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const row: ImportRawRow = {};
    for (let c = 0; c < keys.length; c++) {
      const raw = cells[c] ?? "";
      if (detectCsvInjection(raw)) injectionCount += 1;
      row[keys[c]] = sanitizeCsvCell(raw);
    }
    if (isRowEmpty(row)) continue;
    rows.push(row);
  }

  if (injectionCount > 0) {
    warnings.push(
      `${injectionCount} célula(s) com possível CSV/formula injection neutralizada(s).`,
    );
  }

  return {
    format: "csv",
    fileName: "clipboard-table.tsv",
    columns,
    rows,
    totalRows: rows.length,
    emptyRowsRemoved: 0,
    warnings,
  };
}

function parseJsonContent(content: string): ImportParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("JSON colado inválido.");
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length === 0) {
    throw new Error("JSON colado não contém registros.");
  }

  const keySet = new Set<string>();
  for (const item of items) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      for (const k of Object.keys(item as Record<string, unknown>)) {
        keySet.add(k);
      }
    }
  }

  const keys = [...keySet];
  if (keys.length === 0) {
    throw new Error("JSON colado não possui campos mapeáveis.");
  }

  const columns: ImportColumn[] = keys.map((key, index) => ({
    key,
    label: key,
    index,
    sampleValues: [],
  }));

  const warnings: string[] = [];
  let injectionCount = 0;
  const rows: ImportRawRow[] = items.map((item) => {
    const row: ImportRawRow = {};
    const obj = (item ?? {}) as Record<string, unknown>;
    for (const key of keys) {
      const raw = obj[key];
      const text = raw == null ? "" : typeof raw === "object" ? JSON.stringify(raw) : String(raw);
      if (detectCsvInjection(text)) injectionCount += 1;
      row[key] = sanitizeCsvCell(text);
    }
    return row;
  });

  if (injectionCount > 0) {
    warnings.push(
      `${injectionCount} valor(es) JSON com possível CSV injection neutralizado(s).`,
    );
  }

  return {
    format: "csv",
    fileName: "clipboard.json",
    columns,
    rows,
    totalRows: rows.length,
    emptyRowsRemoved: 0,
    warnings,
  };
}

function parseStructuredText(content: string): ImportParseResult {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Texto estruturado vazio.");
  }

  const columns: ImportColumn[] = [
    { key: "line", label: "Linha", index: 0, sampleValues: [] },
    { key: "text", label: "Texto", index: 1, sampleValues: [] },
  ];

  const rows: ImportRawRow[] = lines.map((line, idx) => ({
    line: idx + 1,
    text: sanitizeCsvCell(line),
  }));

  return {
    format: "csv",
    fileName: "clipboard-text.txt",
    columns,
    rows,
    totalRows: rows.length,
    emptyRowsRemoved: 0,
    warnings: ["Texto estruturado parseado linha a linha — revise o mapeamento."],
  };
}

/** Parse unificado de payload colado da área de transferência. */
export function parseClipboardPayload(payload: ClipboardPayload): ImportParseResult {
  const fileName = payload.fileName ?? `clipboard-${payload.kind}`;

  switch (payload.kind) {
    case "csv":
      return parseCsvBuffer(Buffer.from(payload.content, "utf8"), fileName);
    case "table":
      return parseTableContent(payload.content);
    case "json":
      return parseJsonContent(payload.content);
    case "structured_text":
      return parseStructuredText(payload.content);
    default:
      throw new Error(`Tipo de clipboard desconhecido: ${String(payload.kind)}`);
  }
}
