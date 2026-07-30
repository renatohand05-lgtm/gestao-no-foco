import { suggestColumnMapping, unknownSourceColumns } from "../mapping/auto-map.ts";
import type {
  ImportColumnMapping,
  ImportFieldDef,
  ImportParseResult,
  ImportPreview,
} from "../types/index.ts";
import { validateMapping } from "../validators/row-validator.ts";

export function buildImportPreview(input: {
  parsed: ImportParseResult;
  targetFields: ImportFieldDef[];
  mapping?: ImportColumnMapping | null;
}): ImportPreview {
  const mapping =
    input.mapping ??
    suggestColumnMapping(
      input.parsed.columns.map((c) => c.key),
      input.targetFields,
    );

  const mappingIssues = validateMapping(mapping, input.targetFields);
  const firstRows = input.parsed.rows.slice(0, 5);
  const lastRows =
    input.parsed.rows.length > 5
      ? input.parsed.rows.slice(-3)
      : [];

  return {
    format: input.parsed.format,
    fileName: input.parsed.fileName,
    columns: input.parsed.columns,
    unknownColumns: unknownSourceColumns(
      input.parsed.columns.map((c) => c.key),
      mapping,
    ),
    totalRows: input.parsed.totalRows,
    firstRows,
    lastRows,
    issues: mappingIssues,
    warnings: input.parsed.warnings,
    mapping,
    targetFields: input.targetFields,
  };
}
