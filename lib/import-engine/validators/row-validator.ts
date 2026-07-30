import type {
  ImportColumnMapping,
  ImportFieldDef,
  ImportIssue,
  ImportNormalizedRow,
  ImportRawRow,
} from "../types/index.ts";
import {
  fingerprintRow,
  normalizeText,
  parseBrazilianOrAmericanNumber,
  parseFlexibleDate,
} from "../parsers/normalize.ts";

export function validateMapping(
  mapping: ImportColumnMapping,
  targetFields: ImportFieldDef[],
): ImportIssue[] {
  const issues: ImportIssue[] = [];
  for (const field of targetFields) {
    if (field.required && !mapping[field.key]) {
      issues.push({
        code: "missing_column",
        severity: "error",
        field: field.key,
        message: `Coluna obrigatória não mapeada: ${field.label}.`,
      });
    }
  }
  return issues;
}

export function normalizeMappedRows(
  rows: ImportRawRow[],
  mapping: ImportColumnMapping,
  targetFields: ImportFieldDef[],
): ImportNormalizedRow[] {
  const result: ImportNormalizedRow[] = [];
  const fingerprints = new Map<string, number>();

  rows.forEach((raw, idx) => {
    const rowNumber = idx + 2; // 1-based data row assuming header on line 1
    const values: Record<string, unknown> = {};
    const issues: ImportIssue[] = [];

    for (const field of targetFields) {
      const sourceKey = mapping[field.key];
      const rawVal = sourceKey ? raw[sourceKey] : undefined;

      if (field.type === "currency" || field.type === "number") {
        const parsed = parseBrazilianOrAmericanNumber(rawVal);
        if (parsed.warning) {
          issues.push({
            row: rowNumber,
            field: field.key,
            code: "invalid_number",
            severity: field.required ? "error" : "warning",
            message: parsed.warning,
          });
        }
        values[field.key] = parsed.value;
        if (field.required && (parsed.value == null || Number.isNaN(parsed.value))) {
          issues.push({
            row: rowNumber,
            field: field.key,
            code: "required",
            severity: "error",
            message: `${field.label} é obrigatório.`,
          });
        }
      } else if (field.type === "date") {
        const parsed = parseFlexibleDate(rawVal);
        if (parsed.warning) {
          issues.push({
            row: rowNumber,
            field: field.key,
            code: "invalid_date",
            severity: field.required ? "error" : "warning",
            message: parsed.warning,
          });
        }
        values[field.key] = parsed.value;
        if (field.required && !parsed.value) {
          issues.push({
            row: rowNumber,
            field: field.key,
            code: "required",
            severity: "error",
            message: `${field.label} é obrigatória.`,
          });
        }
      } else if (field.type === "enum") {
        const text = normalizeText(rawVal);
        values[field.key] = text || null;
        if (field.required && !text) {
          issues.push({
            row: rowNumber,
            field: field.key,
            code: "required",
            severity: "error",
            message: `${field.label} é obrigatório.`,
          });
        } else if (
          text &&
          field.enumValues &&
          !field.enumValues.some(
            (e) => e.toLowerCase() === text.toLowerCase(),
          )
        ) {
          issues.push({
            row: rowNumber,
            field: field.key,
            code: "invalid_enum",
            severity: "warning",
            message: `${field.label} com valor não reconhecido: ${text}.`,
          });
        }
      } else {
        const text = normalizeText(rawVal);
        values[field.key] = text || null;
        if (field.required && !text) {
          issues.push({
            row: rowNumber,
            field: field.key,
            code: "required",
            severity: "error",
            message: `${field.label} é obrigatório.`,
          });
        }
      }
    }

    const fp = fingerprintRow({
      description: values.description,
      amount: values.amount,
      date: values.date,
    });
    const prev = fingerprints.get(fp);
    if (prev != null) {
      issues.push({
        row: rowNumber,
        code: "duplicate",
        severity: "warning",
        message: `Possível duplicidade com a linha ${prev}.`,
      });
    } else {
      fingerprints.set(fp, rowNumber);
    }

    result.push({ rowNumber, raw, values, issues, fingerprint: fp });
  });

  return result;
}
