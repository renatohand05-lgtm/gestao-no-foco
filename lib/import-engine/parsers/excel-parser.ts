import * as XLSX from "xlsx";

import type {
  ImportColumn,
  ImportFormat,
  ImportParseResult,
  ImportRawRow,
} from "../types/index.ts";
import { detectCsvInjection } from "./csv-security.ts";
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

function scoreSheetAsImportData(
  workbook: XLSX.WorkBook,
  sheetName: string,
): number {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return -1;
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });
  if (!matrix.length) return -1;
  const header = (matrix[0] ?? [])
    .map((c) => normalizeHeader(String(c ?? "")))
    .filter(Boolean);
  if (!header.length) return -1;

  let score = 0;
  const name = sheetName.toLowerCase();
  if (name.includes("importacao") || name.includes("importação")) score += 50;
  if (name === "produtos" || name.includes("servico")) score += 30;
  if (name === "resumo" || name === "leia_me" || name === "premissas") {
    score -= 40;
  }

  const markers = [
    "codigo_servico",
    "nome_servico",
    "sku",
    "codigo_barras",
    "nome",
    "categoria",
    "quantidade_atual",
    "preco_venda",
  ];
  for (const m of markers) {
    if (header.includes(m)) score += 10;
  }
  // Prefer sheets with many columns (tabular import) over title sheets
  score += Math.min(header.length, 20);
  // Prefer sheets with body rows
  score += Math.min(Math.max(matrix.length - 1, 0), 100) > 0 ? 15 : 0;
  return score;
}

function pickImportSheet(workbook: XLSX.WorkBook): string {
  const names = workbook.SheetNames;
  if (!names.length) {
    throw new Error("A planilha Excel não contém abas.");
  }
  let best = names[0];
  let bestScore = -Infinity;
  for (const name of names) {
    const score = scoreSheetAsImportData(workbook, name);
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return best;
}

export function parseExcelBuffer(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
  format: Extract<ImportFormat, "xlsx" | "xls">,
): ImportParseResult {
  const data =
    Buffer.isBuffer(buffer)
      ? buffer
      : Buffer.from(
          buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer,
        );

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, {
      type: "buffer",
      cellDates: true,
      raw: false,
    });
  } catch {
    throw new Error(
      "Não foi possível ler o Excel. O arquivo pode estar corrompido ou protegido por senha.",
    );
  }

  const sheetName = pickImportSheet(workbook);
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(
    sheet,
    {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    },
  );

  if (!matrix.length) {
    throw new Error("A planilha Excel está vazia.");
  }

  const headerRow = (matrix[0] ?? []).map((c) => normalizeText(c));
  if (headerRow.every((h) => !h)) {
    throw new Error(
      "Não foi possível identificar o cabeçalho da planilha. A primeira linha deve conter os nomes das colunas.",
    );
  }

  const keys = uniqueKeys(headerRow);
  const columns: ImportColumn[] = keys.map((key, index) => ({
    key,
    label: headerRow[index] || key,
    index,
    sampleValues: [],
  }));

  let emptyRowsRemoved = 0;
  const rows: ImportRawRow[] = [];
  const warnings: string[] = [];
  let formulaCellWarnings = 0;

  if (workbook.SheetNames.length > 1) {
    warnings.push(
      `Arquivo com ${workbook.SheetNames.length} abas (${workbook.SheetNames.join(", ")}) — lida a aba "${sheetName}" (melhor candidata a importação).`,
    );
  }

  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] ?? [];
    const mapped: ImportRawRow = {};
    for (let i = 0; i < keys.length; i++) {
      const cell = line[i];
      if (cell instanceof Date) {
        mapped[keys[i]] = cell;
      } else if (typeof cell === "number" || typeof cell === "boolean") {
        mapped[keys[i]] = cell;
      } else {
        const text = normalizeText(cell);
        if (detectCsvInjection(text)) formulaCellWarnings += 1;
        mapped[keys[i]] = text;
      }
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

  if (emptyRowsRemoved > 0) {
    warnings.push(`${emptyRowsRemoved} linha(s) vazia(s) removida(s).`);
  }
  if (formulaCellWarnings > 0) {
    warnings.push(
      `${formulaCellWarnings} célula(s) de texto iniciam com =, +, - ou @ (risco de formula injection ao reexportar).`,
    );
  }

  return {
    format,
    fileName,
    columns,
    rows,
    totalRows: rows.length,
    emptyRowsRemoved,
    warnings,
  };
}
