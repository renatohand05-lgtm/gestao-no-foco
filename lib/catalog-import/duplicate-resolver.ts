/**
 * Sprint 25.3 — Detecção de duplicidades (sem sobrescrita silenciosa).
 */

export type DuplicateDecision = "ignore" | "update" | "duplicate_new_code" | "review";

export type DuplicateMatch = {
  rowNumber: number;
  code: string;
  matchType: "exact_code" | "sku" | "barcode" | "name_normalized";
  existingId: string | null;
  confidence: number;
  decisionRequired: true;
  suggestedDecision: DuplicateDecision;
};

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findServiceDuplicates(input: {
  rows: Array<{ rowNumber: number; codigo: string; nome: string }>;
  existingByCode: Map<string, string>;
}): DuplicateMatch[] {
  const out: DuplicateMatch[] = [];
  const seen = new Set<string>();
  for (const row of input.rows) {
    const code = row.codigo.trim().toUpperCase();
    if (!code) continue;
    if (seen.has(code)) {
      out.push({
        rowNumber: row.rowNumber,
        code,
        matchType: "exact_code",
        existingId: null,
        confidence: 1,
        decisionRequired: true,
        suggestedDecision: "review",
      });
      continue;
    }
    seen.add(code);
    const existingId = input.existingByCode.get(code) ?? null;
    if (existingId) {
      out.push({
        rowNumber: row.rowNumber,
        code,
        matchType: "exact_code",
        existingId,
        confidence: 1,
        decisionRequired: true,
        suggestedDecision: "update",
      });
    }
  }
  return out;
}

export function findProductDuplicates(input: {
  rows: Array<{
    rowNumber: number;
    sku: string | null;
    barcode: string | null;
    nome: string;
  }>;
  existingBySku: Map<string, string>;
  existingByBarcode: Map<string, string>;
}): DuplicateMatch[] {
  const out: DuplicateMatch[] = [];
  for (const row of input.rows) {
    const sku = row.sku?.trim().toUpperCase() ?? "";
    const barcode = row.barcode?.trim() ?? "";
    if (sku && input.existingBySku.has(sku)) {
      out.push({
        rowNumber: row.rowNumber,
        code: sku,
        matchType: "sku",
        existingId: input.existingBySku.get(sku) ?? null,
        confidence: 1,
        decisionRequired: true,
        suggestedDecision: "update",
      });
    }
    if (barcode && input.existingByBarcode.has(barcode)) {
      out.push({
        rowNumber: row.rowNumber,
        code: barcode,
        matchType: "barcode",
        existingId: input.existingByBarcode.get(barcode) ?? null,
        confidence: 1,
        decisionRequired: true,
        suggestedDecision: "review",
      });
    }
  }
  return out;
}
