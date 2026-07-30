/**
 * Sprint 22.8 — Parser PDF → ImportParseResult.
 * Nunca inventa campos; usa colunas tabulares quando detectadas.
 */
import type {
  ImportColumn,
  ImportParseResult,
  ImportRawRow,
} from "../types/index.ts";
import { normalizeHeader, normalizeText } from "./normalize.ts";
import {
  extractPdfText,
  PdfCorruptedError,
  type PdfTextExtractionResult,
} from "./pdf-text-extractor.ts";

export type PdfParseResult =
  | { kind: "parsed"; result: ImportParseResult }
  | {
      kind: "requires_confirmation";
      extraction: PdfTextExtractionResult;
      previewRows: ImportRawRow[];
      message: string;
    };

const TABULAR_DELIMITERS = [/\t+/, /\s{2,}/, /\|/];

function looksTabular(lines: string[]): boolean {
  if (lines.length < 2) return false;
  for (const delim of TABULAR_DELIMITERS) {
    const counts = lines.slice(0, Math.min(5, lines.length)).map((l) => l.split(delim).length);
    const first = counts[0];
    if (first >= 2 && counts.every((c) => c === first || c === first - 1 || c === first + 1)) {
      return true;
    }
  }
  return false;
}

function splitTabularLine(line: string): string[] {
  if (line.includes("\t")) return line.split(/\t+/).map((c) => c.trim());
  if (line.includes("|")) return line.split(/\|/).map((c) => c.trim());
  return line.split(/\s{2,}/).map((c) => c.trim());
}

function buildTabularResult(
  lines: string[],
  fileName: string,
  warnings: string[],
): ImportParseResult {
  const headerCells = splitTabularLine(lines[0]);
  const keys = headerCells.map((h, i) => normalizeHeader(h) || `coluna_${i + 1}`);
  const columns: ImportColumn[] = keys.map((key, index) => ({
    key,
    label: normalizeText(headerCells[index]) || key,
    index,
    sampleValues: [],
  }));

  const rows: ImportRawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitTabularLine(lines[i]);
    if (cells.every((c) => !c)) continue;
    const row: ImportRawRow = {};
    for (let c = 0; c < keys.length; c++) {
      row[keys[c]] = normalizeText(cells[c] ?? "");
    }
    rows.push(row);
    for (const col of columns) {
      if (col.sampleValues.length < 3) {
        const v = normalizeText(row[col.key]);
        if (v) col.sampleValues.push(v);
      }
    }
  }

  return {
    format: "pdf",
    fileName,
    columns,
    rows,
    totalRows: rows.length,
    emptyRowsRemoved: 0,
    warnings,
  };
}

function buildLineResult(
  text: string,
  fileName: string,
  warnings: string[],
): ImportParseResult {
  const pages = text.split("\f");
  const columns: ImportColumn[] = [
    { key: "page", label: "Página", index: 0, sampleValues: [] },
    { key: "line", label: "Linha", index: 1, sampleValues: [] },
    { key: "text", label: "Texto", index: 2, sampleValues: [] },
  ];
  const rows: ImportRawRow[] = [];

  pages.forEach((pageText, pageIdx) => {
    const lines = pageText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    lines.forEach((line, lineIdx) => {
      rows.push({
        page: pageIdx + 1,
        line: lineIdx + 1,
        text: line,
      });
    });
  });

  for (const col of columns) {
    for (const row of rows.slice(0, 3)) {
      const v = normalizeText(row[col.key]);
      if (v) col.sampleValues.push(v);
    }
  }

  return {
    format: "pdf",
    fileName,
    columns,
    rows,
    totalRows: rows.length,
    emptyRowsRemoved: 0,
    warnings,
  };
}

export function parsePdfBuffer(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
): ImportParseResult {
  let extraction: PdfTextExtractionResult;
  try {
    extraction = extractPdfText(buffer);
  } catch (err) {
    if (err instanceof PdfCorruptedError) throw err;
    throw new Error(
      err instanceof Error ? err.message : "Não foi possível ler o PDF.",
    );
  }

  if (extraction.status === "image_only") {
    throw new Error(
      "PDF image-only (sem texto pesquisável). OCR não está disponível — exporte o documento como CSV/Excel ou use um PDF com texto selecionável.",
    );
  }

  const flatLines = extraction.text
    .replace(/\f/g, "\n")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const warnings = [...extraction.warnings];
  if (flatLines.length === 0) {
    throw new Error("Nenhum texto extraível encontrado no PDF.");
  }

  if (looksTabular(flatLines)) {
    warnings.push("Texto tabular detectado — colunas inferidas a partir do layout.");
    return buildTabularResult(flatLines, fileName, warnings);
  }

  warnings.push(
    "PDF parseado como linhas de texto (page/line/text) — revise o mapeamento antes de importar.",
  );
  return buildLineResult(extraction.text, fileName, warnings);
}

/** Variante que pode sinalizar confirmação quando o layout é ambíguo. */
export function parsePdfBufferWithPreview(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
): PdfParseResult {
  const result = parsePdfBuffer(buffer, fileName);
  if (result.warnings.some((w) => w.includes("page/line/text"))) {
    return {
      kind: "requires_confirmation",
      extraction: extractPdfText(buffer),
      previewRows: result.rows.slice(0, 10),
      message: "Revise as linhas extraídas do PDF antes de confirmar o mapeamento.",
    };
  }
  return { kind: "parsed", result };
}
