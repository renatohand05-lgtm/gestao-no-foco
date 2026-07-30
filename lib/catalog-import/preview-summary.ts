/**
 * Sprint 25.3 — Preview Enterprise (resumo antes da confirmação).
 */

export type CatalogImportPreviewSummary = {
  fileName: string;
  detectedType: string;
  totalRows: number;
  financialTotal: number | null;
  newServices: number;
  newProducts: number;
  updatedProducts: number;
  ignored: number;
  duplicates: number;
  errors: number;
  lowConfidence: number;
  unrecognizedFields: string[];
  stockQtyTotal: number | null;
  stockValueTotal: number | null;
  depositLabel: string | null;
  supplierLabel: string | null;
  accountsPayablePreview: number | null;
  priceBand: string | null;
  notes: string[];
};

export function buildCatalogPreviewSummary(
  partial: Partial<CatalogImportPreviewSummary> &
    Pick<CatalogImportPreviewSummary, "fileName" | "detectedType" | "totalRows">,
): CatalogImportPreviewSummary {
  return {
    financialTotal: null,
    newServices: 0,
    newProducts: 0,
    updatedProducts: 0,
    ignored: 0,
    duplicates: 0,
    errors: 0,
    lowConfidence: 0,
    unrecognizedFields: [],
    stockQtyTotal: null,
    stockValueTotal: null,
    depositLabel: null,
    supplierLabel: null,
    accountsPayablePreview: null,
    priceBand: null,
    notes: [],
    ...partial,
  };
}

export function sumFinite(values: Array<number | null | undefined>): number | null {
  let total = 0;
  let any = false;
  for (const v of values) {
    if (v == null || !Number.isFinite(v)) continue;
    total += v;
    any = true;
  }
  return any ? Math.round(total * 100) / 100 : null;
}
