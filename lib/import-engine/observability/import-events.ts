/**
 * Sprint 22.10 — Eventos de observabilidade da Import Engine.
 *
 * IMPORTANTE: não registar conteúdo integral de documentos, tokens,
 * credenciais, PII desnecessária nem dados bancários sensíveis.
 */

export const IMPORT_EVENT_NAMES = [
  "import.upload.started",
  "import.upload.completed",
  "import.upload.failed",
  "import.detect.started",
  "import.detect.completed",
  "import.parse.started",
  "import.parse.completed",
  "import.parse.failed",
  "import.classify.started",
  "import.classify.completed",
  "import.review.queued",
  "import.review.completed",
  "import.confirm.started",
  "import.confirm.completed",
  "import.confirm.failed",
  "import.error",
  "import.rollback.started",
  "import.rollback.completed",
  "import.rollback.failed",
  "import.reconciliation.started",
  "import.reconciliation.completed",
  "import.sync.started",
  "import.sync.completed",
  "import.sync.failed",
  "import.webhook.received",
  "import.webhook.rejected",
  "import.api.request",
  "import.api.rejected",
  "import.provider.invoked",
  "import.provider.failed",
] as const;

export type ImportEventName = (typeof IMPORT_EVENT_NAMES)[number];

export type ImportEventOutcome = "success" | "failure" | "partial" | "skipped";

export type ImportEventPayload = {
  tenantId: string;
  correlationId?: string;
  sessionId?: string;
  module?: string;
  format?: string;
  runId?: string;
  connectorId?: string;
  outcome?: ImportEventOutcome;
  errorCode?: string;
  errorCategory?: string;
  durationMs?: number;
  rowCount?: number;
  importedRows?: number;
  rejectedRows?: number;
  /** Apenas nome do ficheiro — nunca bytes/conteúdo. */
  fileName?: string;
  /** Tamanho em bytes — metadado, não conteúdo. */
  fileBytes?: number;
};

const FORBIDDEN_PAYLOAD_KEYS = new Set([
  "content",
  "rawBody",
  "documentContent",
  "fileContent",
  "token",
  "apiKey",
  "secret",
  "password",
  "credential",
  "credentials",
  "authorization",
  "accountNumber",
  "iban",
  "cpf",
  "cnpj",
  "bankAccount",
  "statementLines",
  "rows",
  "payload",
]);

export type ImportEventRecord = {
  event: ImportEventName;
  timestamp: string;
  payload: ImportEventPayload;
};

function redactValue(key: string, value: unknown): unknown {
  const lower = key.toLowerCase();
  if (FORBIDDEN_PAYLOAD_KEYS.has(lower)) {
    return "[redacted]";
  }
  if (typeof value === "string" && value.length > 500) {
    return `[truncated:${value.length}]`;
  }
  return value;
}

/** Remove campos sensíveis antes de emitir ou persistir eventos. */
export function sanitizeImportEventPayload(
  payload: Record<string, unknown>,
): ImportEventPayload {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (FORBIDDEN_PAYLOAD_KEYS.has(key)) continue;
    safe[key] = redactValue(key, value);
  }

  const tenantId =
    typeof safe.tenantId === "string" && safe.tenantId.trim()
      ? safe.tenantId.trim()
      : "unknown";

  return {
    tenantId,
    correlationId: typeof safe.correlationId === "string" ? safe.correlationId : undefined,
    sessionId: typeof safe.sessionId === "string" ? safe.sessionId : undefined,
    module: typeof safe.module === "string" ? safe.module : undefined,
    format: typeof safe.format === "string" ? safe.format : undefined,
    runId: typeof safe.runId === "string" ? safe.runId : undefined,
    connectorId: typeof safe.connectorId === "string" ? safe.connectorId : undefined,
    outcome:
      safe.outcome === "success" ||
      safe.outcome === "failure" ||
      safe.outcome === "partial" ||
      safe.outcome === "skipped"
        ? safe.outcome
        : undefined,
    errorCode: typeof safe.errorCode === "string" ? safe.errorCode : undefined,
    errorCategory: typeof safe.errorCategory === "string" ? safe.errorCategory : undefined,
    durationMs: typeof safe.durationMs === "number" ? safe.durationMs : undefined,
    rowCount: typeof safe.rowCount === "number" ? safe.rowCount : undefined,
    importedRows: typeof safe.importedRows === "number" ? safe.importedRows : undefined,
    rejectedRows: typeof safe.rejectedRows === "number" ? safe.rejectedRows : undefined,
    fileName: typeof safe.fileName === "string" ? safe.fileName.slice(0, 255) : undefined,
    fileBytes: typeof safe.fileBytes === "number" ? safe.fileBytes : undefined,
  };
}

type ImportEventSink = (record: ImportEventRecord) => void;

let sink: ImportEventSink = defaultSink;

function defaultSink(record: ImportEventRecord): void {
  console.info("[import-event]", JSON.stringify(record));
}

/** Permite substituir o destino (testes / integração futura). */
export function setImportEventSink(next: ImportEventSink | null): void {
  sink = next ?? defaultSink;
}

export function emitImportEvent(
  event: ImportEventName,
  payload: ImportEventPayload | Record<string, unknown>,
): ImportEventRecord {
  const sanitized = sanitizeImportEventPayload(payload as Record<string, unknown>);
  const record: ImportEventRecord = {
    event,
    timestamp: new Date().toISOString(),
    payload: sanitized,
  };
  sink(record);
  return record;
}

export function buildImportCorrelationId(prefix = "imp"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
