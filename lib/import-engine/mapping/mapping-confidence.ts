/**
 * Sprint 22.6 — Confiança do mapeamento por campo.
 * Explica ao utilizador por que uma coluna foi (ou não) reconhecida
 * automaticamente, sem alterar a lógica de sugestão (`auto-map.ts`).
 */
import { normalizeHeader } from "../parsers/normalize.ts";
import type {
  ImportColumn,
  ImportColumnMapping,
  ImportFieldDef,
  ImportMappingConfidence,
} from "../types/index.ts";
import { FIELD_ALIASES } from "./auto-map.ts";

const HIGH_CONFIDENCE = 0.97;
const FUZZY_CONFIDENCE = 0.6;
const UNKNOWN_COLUMN_CONFIDENCE = 0.3;

function fieldAliases(field: ImportFieldDef): string[] {
  return [field.key, field.label, ...(FIELD_ALIASES[field.key] ?? [])].map((a) =>
    normalizeHeader(a),
  );
}

export function computeMappingConfidence(
  mapping: ImportColumnMapping,
  columns: Array<ImportColumn | string>,
  fields: ImportFieldDef[],
): ImportMappingConfidence[] {
  const columnKeys = new Set(
    columns.map((c) => (typeof c === "string" ? c : c.key)),
  );

  return fields.map((field): ImportMappingConfidence => {
    const sourceColumn = mapping[field.key] ?? null;

    if (!sourceColumn) {
      return {
        fieldKey: field.key,
        sourceColumn: null,
        confidence: 0,
        status: "unrecognized",
      };
    }

    const aliases = fieldAliases(field);
    const normalizedSource = normalizeHeader(sourceColumn);
    const exactAliasMatch = aliases.some((a) => a === normalizedSource);

    if (exactAliasMatch) {
      return {
        fieldKey: field.key,
        sourceColumn,
        confidence: HIGH_CONFIDENCE,
        status: "recognized",
      };
    }

    const fuzzyAliasMatch = aliases.some(
      (a) => normalizedSource.includes(a) || a.includes(normalizedSource),
    );
    if (fuzzyAliasMatch) {
      return {
        fieldKey: field.key,
        sourceColumn,
        confidence: FUZZY_CONFIDENCE,
        status: "needs_confirmation",
      };
    }

    // Coluna mapeada manualmente sem correspondência de alias conhecida —
    // ainda pode estar correta, mas exige confirmação do utilizador.
    return {
      fieldKey: field.key,
      sourceColumn,
      confidence: columnKeys.has(sourceColumn)
        ? UNKNOWN_COLUMN_CONFIDENCE
        : 0,
      status: columnKeys.has(sourceColumn) ? "needs_confirmation" : "unrecognized",
    };
  });
}
