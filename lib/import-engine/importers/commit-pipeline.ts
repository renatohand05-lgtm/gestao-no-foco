import type {
  ImportCommitRequest,
  ImportCommitResult,
  ImportIssue,
  ImportReviewRow,
} from "../types/index.ts";
import type { ImportHistoryStore } from "../history/import-history-store.ts";

export type RowCommitHandler = (row: ImportReviewRow) => Promise<void>;

/**
 * Pipeline genérico de commit — o módulo consumidor fornece o handler.
 * Nunca cria registros sem confirmação explícita (confirmedRowNumbers).
 */
export async function commitImportRows(input: {
  request: ImportCommitRequest;
  history: ImportHistoryStore;
  userLabel: string;
  onCommitRow: RowCommitHandler;
  allowStatuses?: Array<ImportReviewRow["classification"]["status"]>;
  /** Sprint 22.6 — metadados de persistência/aprendizado gravados no histórico. */
  profileId?: string | null;
  profileName?: string | null;
  correlationId?: string | null;
}): Promise<ImportCommitResult> {
  const started = Date.now();
  const allow = new Set(
    input.allowStatuses ?? ["auto", "confirmed", "edited"],
  );
  const confirmed = new Set(input.request.confirmedRowNumbers);
  const errors: ImportIssue[] = [];
  let imported = 0;
  let rejected = 0;
  let skipped = 0;

  for (const row of input.request.rows) {
    if (!confirmed.has(row.rowNumber)) {
      skipped += 1;
      continue;
    }
    const hasError = row.issues.some((i) => i.severity === "error");
    if (hasError) {
      rejected += 1;
      errors.push({
        row: row.rowNumber,
        code: "row_invalid",
        severity: "error",
        message: `Linha ${row.rowNumber} possui erros e não foi importada.`,
      });
      continue;
    }
    if (!allow.has(row.classification.status)) {
      skipped += 1;
      continue;
    }
    try {
      await input.onCommitRow(row);
      imported += 1;
    } catch (err) {
      rejected += 1;
      errors.push({
        row: row.rowNumber,
        code: "commit_failed",
        severity: "error",
        message:
          err instanceof Error
            ? err.message
            : `Falha ao importar linha ${row.rowNumber}.`,
      });
    }
  }

  const durationMs = Date.now() - started;
  const status =
    rejected > 0 && imported > 0
      ? "partial"
      : rejected > 0 && imported === 0
        ? "failed"
        : "completed";

  const log = await input.history.append({
    tenantId: input.request.tenantId,
    userId: input.request.userId,
    userLabel: input.userLabel,
    module: input.request.module,
    targetEntity: input.request.targetEntity,
    fileName: input.request.fileName,
    format: input.request.format,
    status,
    totalRows: input.request.rows.length,
    importedRows: imported,
    rejectedRows: rejected,
    errorCount: errors.length,
    durationMs,
    errorsSample: errors.slice(0, 5).map((e) => e.message),
    mappingSnapshot: input.request.mapping,
    profileId: input.profileId ?? null,
    profileName: input.profileName ?? null,
    correlationId: input.correlationId ?? null,
    engineVersion: "22.6",
  });

  return {
    imported,
    rejected,
    skipped,
    errors,
    durationMs,
    logId: log.id,
  };
}
