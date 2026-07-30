import Papa from "papaparse";

import type {
  ImportColumn,
  ImportParseResult,
  ImportRawRow,
} from "../types/index.ts";
import { detectCsvInjection, sanitizeCsvCell } from "./csv-security.ts";
import { isRowEmpty, normalizeHeader, normalizeText } from "./normalize.ts";

function uniqueKeys(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h, i) => {
    const base = normalizeHeader(h) || `coluna_${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}_${n}`;
  });
}

export function parseCsvBuffer(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
): ImportParseResult {
  let text: string;
  if (Buffer.isBuffer(buffer)) {
    // Strip UTF-8 BOM
    text =
      buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf
        ? buffer.subarray(3).toString("utf8")
        : buffer.toString("utf8");
  } else {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      text = new TextDecoder("utf-8").decode(bytes.subarray(3));
    } else {
      text = new TextDecoder("utf-8").decode(bytes);
    }
  }

  if (!text.trim()) {
    throw new Error("O arquivo CSV está vazio.");
  }

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h,
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });

  if (parsed.errors.length > 0) {
    const fatal = parsed.errors.filter((e) => e.type === "Delimiter" || e.type === "Quotes");
    if (fatal.length > 0 && (!parsed.data || parsed.data.length === 0)) {
      throw new Error(
        `CSV inválido: ${fatal[0]?.message ?? "erro de parsing"}. Verifique delimitadores e aspas.`,
      );
    }
  }

  const rawHeaders = parsed.meta.fields ?? [];
  if (rawHeaders.length === 0) {
    throw new Error(
      "Não foi possível identificar o cabeçalho do CSV. Confirme se a primeira linha contém os nomes das colunas.",
    );
  }

  const keys = uniqueKeys(rawHeaders);
  const columns: ImportColumn[] = keys.map((key, index) => ({
    key,
    label: normalizeText(rawHeaders[index]) || key,
    index,
    sampleValues: [],
  }));

  let emptyRowsRemoved = 0;
  const rows: ImportRawRow[] = [];
  let injectionWarnings = 0;

  for (const row of parsed.data) {
    const mapped: ImportRawRow = {};
    for (let i = 0; i < keys.length; i++) {
      const original = rawHeaders[i];
      const raw = normalizeText(row[original] ?? "");
      if (detectCsvInjection(raw)) injectionWarnings += 1;
      mapped[keys[i]] = sanitizeCsvCell(raw);
    }
    if (isRowEmpty(mapped)) {
      emptyRowsRemoved += 1;
      continue;
    }
    rows.push(mapped);
    for (const col of columns) {
      if (col.sampleValues.length < 3) {
        const v = normalizeText(mapped[col.key]);
        if (v) col.sampleValues.push(v);
      }
    }
  }

  const warnings: string[] = [];
  if (parsed.errors.length > 0) {
    warnings.push(
      `${parsed.errors.length} aviso(s) de parsing CSV (linhas parciais podem ter sido ignoradas).`,
    );
  }
  if (emptyRowsRemoved > 0) {
    warnings.push(`${emptyRowsRemoved} linha(s) vazia(s) removida(s).`);
  }
  if (injectionWarnings > 0) {
    warnings.push(
      `${injectionWarnings} célula(s) com possível CSV/formula injection neutralizada(s).`,
    );
  }

  return {
    format: "csv",
    fileName,
    columns,
    rows,
    totalRows: rows.length,
    emptyRowsRemoved,
    warnings,
  };
}
