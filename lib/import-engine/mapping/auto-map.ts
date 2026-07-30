import type { ImportColumnMapping, ImportFieldDef } from "../types/index.ts";
import { normalizeHeader, stripDiacritics } from "../parsers/normalize.ts";

export const FIELD_ALIASES: Record<string, string[]> = {
  description: [
    "descricao",
    "descrição",
    "historico",
    "histórico",
    "memo",
    "detail",
    "lancamento",
    "lançamento",
    "descrição da despesa",
    "descricao da despesa",
  ],
  amount: [
    "valor",
    "amount",
    "vlr",
    "value",
    "montante",
    "debito",
    "débito",
    "credito",
    "crédito",
  ],
  date: [
    "data",
    "date",
    "competencia",
    "competência",
    "vencimento",
    "pagamento",
    "data movimento",
    "data_movimento",
  ],
  category: ["categoria", "category", "tipo", "classificacao", "classificação"],
  cost_center: [
    "centro de custo",
    "centro_custo",
    "centrocusto",
    "cc",
    "cost center",
  ],
  supplier: ["fornecedor", "supplier", "beneficiario", "beneficiário", "pago a"],
  kind: ["tipo movimento", "entrada/saida", "natureza", "dc", "d/c"],
  account: ["conta", "conta bancaria", "conta bancária", "banco"],
};

export function suggestColumnMapping(
  sourceColumns: string[],
  targetFields: ImportFieldDef[],
): ImportColumnMapping {
  const mapping: ImportColumnMapping = {};
  for (const field of targetFields) {
    mapping[field.key] = null;
  }

  const used = new Set<string>();

  for (const field of targetFields) {
    const aliases = [
      field.key,
      field.label,
      ...(FIELD_ALIASES[field.key] ?? []),
    ].map((a) => normalizeHeader(a));

    let best: string | null = null;
    for (const col of sourceColumns) {
      if (used.has(col)) continue;
      const n = normalizeHeader(col);
      if (aliases.some((a) => a === n || n.includes(a) || a.includes(n))) {
        best = col;
        break;
      }
    }
    if (best) {
      mapping[field.key] = best;
      used.add(best);
    }
  }

  return mapping;
}

export function unknownSourceColumns(
  sourceColumns: string[],
  mapping: ImportColumnMapping,
): string[] {
  const mapped = new Set(
    Object.values(mapping).filter((v): v is string => Boolean(v)),
  );
  return sourceColumns.filter((c) => !mapped.has(c));
}

export function mappingCoverageScore(
  mapping: ImportColumnMapping,
  targetFields: ImportFieldDef[],
): number {
  const required = targetFields.filter((f) => f.required);
  if (required.length === 0) return 1;
  const ok = required.filter((f) => mapping[f.key]).length;
  return ok / required.length;
}

export function headersLookAlike(a: string, b: string): boolean {
  return (
    stripDiacritics(a).toLowerCase().trim() ===
    stripDiacritics(b).toLowerCase().trim()
  );
}
