import { classifyRows, rulesForDomain } from "../classification/rule-classifier.ts";
import { classifyRowsWithLearning } from "../learning/apply-learning.ts";
import { suggestColumnMapping } from "../mapping/auto-map.ts";
import type { ImportMappingStore } from "../mapping/mapping-store.ts";
import { parseImportFile } from "../parsers/index.ts";
import { buildImportPreview } from "../preview/build-preview.ts";
import type { ImportHistoryStore } from "../history/import-history-store.ts";
import type {
  ClassificationDomain,
  ImportColumnMapping,
  ImportFieldDef,
  ImportLearningRule,
  ImportNormalizedRow,
  ImportParseResult,
  ImportPreview,
  ImportReviewRow,
} from "../types/index.ts";
import {
  normalizeMappedRows,
  validateMapping,
} from "../validators/row-validator.ts";
import {
  commitImportRows,
  type RowCommitHandler,
} from "../importers/commit-pipeline.ts";

export class ImportEngineService {
  private readonly mappingStore: ImportMappingStore;
  private readonly historyStore: ImportHistoryStore;

  constructor(
    mappingStore: ImportMappingStore,
    historyStore: ImportHistoryStore,
  ) {
    this.mappingStore = mappingStore;
    this.historyStore = historyStore;
  }

  parseFile(input: {
    fileName: string;
    mimeType?: string | null;
    bytes: Buffer | ArrayBuffer | Uint8Array;
  }): ImportParseResult {
    return parseImportFile(input);
  }

  async buildPreview(input: {
    tenantId: string;
    module: string;
    targetEntity: string;
    parsed: ImportParseResult;
    targetFields: ImportFieldDef[];
    mapping?: ImportColumnMapping | null;
  }): Promise<ImportPreview> {
    let mapping = input.mapping ?? null;
    if (!mapping) {
      const saved = await this.mappingStore.getDefault(
        input.tenantId,
        input.module,
        input.targetEntity,
      );
      mapping = saved?.mapping ?? null;
    }
    if (!mapping) {
      mapping = suggestColumnMapping(
        input.parsed.columns.map((c) => c.key),
        input.targetFields,
      );
    }
    return buildImportPreview({
      parsed: input.parsed,
      targetFields: input.targetFields,
      mapping,
    });
  }

  normalize(
    parsed: ImportParseResult,
    mapping: ImportColumnMapping,
    targetFields: ImportFieldDef[],
  ): ImportNormalizedRow[] {
    const mapIssues = validateMapping(mapping, targetFields);
    if (mapIssues.some((i) => i.severity === "error")) {
      throw new Error(
        mapIssues
          .filter((i) => i.severity === "error")
          .map((i) => i.message)
          .join(" "),
      );
    }
    return normalizeMappedRows(parsed.rows, mapping, targetFields);
  }

  /**
   * @param rows linhas normalizadas
   * @param options.domain domínio de classificação — "finance" por padrão
   *   para manter compatibilidade com o comportamento anterior à Sprint 22.5.1.
   * @param options.learnedRules regras aprendidas do tenant (Sprint 22.6) —
   *   quando fornecidas, têm prioridade sobre o motor de regras estático.
   */
  buildReview(
    rows: ImportNormalizedRow[],
    options?: {
      domain?: ClassificationDomain;
      learnedRules?: ImportLearningRule[];
    },
  ): ImportReviewRow[] {
    const domain = options?.domain ?? "finance";
    const descriptionRows = rows.map((r) => ({
      rowNumber: r.rowNumber,
      description: String(r.values.description ?? ""),
    }));
    const classifications = options?.learnedRules?.length
      ? classifyRowsWithLearning(descriptionRows, domain, options.learnedRules)
      : classifyRows(descriptionRows, { domain, rules: rulesForDomain(domain) });
    const byRow = new Map(classifications.map((c) => [c.rowNumber, c]));
    return rows.map((r) => {
      const classification = byRow.get(r.rowNumber)!;
      // If file already has category, prefer it with high confidence
      const existingCat = r.values.category;
      if (typeof existingCat === "string" && existingCat.trim()) {
        classification.categorySuggested = existingCat.trim();
        classification.confidence = Math.max(classification.confidence, 0.88);
        classification.reason = "Categoria presente no arquivo";
        classification.status =
          classification.confidence >= 0.75 ? "auto" : "low_confidence";
      }
      return {
        rowNumber: r.rowNumber,
        description: String(r.values.description ?? ""),
        values: r.values,
        classification,
        issues: r.issues,
      };
    });
  }

  async saveMapping(input: {
    tenantId: string;
    module: string;
    targetEntity: string;
    mapping: ImportColumnMapping;
    name?: string;
  }) {
    return this.mappingStore.save({
      tenantId: input.tenantId,
      module: input.module,
      targetEntity: input.targetEntity,
      name: input.name ?? "default",
      mapping: input.mapping,
      makeDefault: true,
    });
  }

  listHistory(tenantId: string, module: string, limit = 20) {
    return this.historyStore.list(tenantId, module, limit);
  }

  commit(input: {
    request: Parameters<typeof commitImportRows>[0]["request"];
    userLabel: string;
    onCommitRow: RowCommitHandler;
    profileId?: string | null;
    profileName?: string | null;
    correlationId?: string | null;
  }) {
    return commitImportRows({
      request: input.request,
      history: this.historyStore,
      userLabel: input.userLabel,
      onCommitRow: input.onCommitRow,
      profileId: input.profileId,
      profileName: input.profileName,
      correlationId: input.correlationId,
    });
  }
}
