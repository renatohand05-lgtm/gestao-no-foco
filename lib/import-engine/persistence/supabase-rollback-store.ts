/**
 * Sprint 22.6 — Adapter Supabase do rollback (`import_rollback_events`).
 * Composição fina: a lógica de elegibilidade/segurança vive em
 * `rollback/rollback-store.ts` (canRollbackCore/prepareRollbackCore/
 * executeRollbackCore) — este adapter só persiste os eventos de auditoria
 * append-only e delega ao mesmo núcleo usado pela store em memória.
 */
import { mapKeysCamelToSnake } from "../../enterprise/mappers.ts";
import {
  enterpriseFrom,
  throwIfError,
  type EnterpriseSupabaseClient,
} from "../../enterprise/adapters/supabase-helpers.ts";
import type { ImportHistoryStore } from "../history/import-history-store.ts";
import type { ImportRunItemsStore } from "../history/run-items-store.ts";
import {
  canRollbackCore,
  executeRollbackCore,
  prepareRollbackCore,
  type ImportRollbackStore,
  type RecordRollbackEvent,
} from "../rollback/rollback-store.ts";

export type SupabaseRollbackStoreDeps = {
  history: ImportHistoryStore;
  runItems: ImportRunItemsStore;
};

export function createSupabaseRollbackStore(
  client: EnterpriseSupabaseClient,
  deps: SupabaseRollbackStoreDeps,
): ImportRollbackStore {
  const recordEvent: RecordRollbackEvent = async (event) => {
    const row = mapKeysCamelToSnake({
      tenantId: event.tenantId,
      runId: event.runId,
      status: event.status,
      affectedRows: event.affectedRows,
      reason: event.reason,
      requestedBy: event.requestedBy,
      completedAt: event.completedAt,
      metadata: {},
    });
    const { error } = await enterpriseFrom(client, "import_rollback_events").insert(row);
    throwIfError(error, "import.rollback.recordEvent");
  };

  return {
    canRollback(tenantId, logId) {
      return canRollbackCore(deps.history, deps.runItems, tenantId, logId);
    },
    prepareRollback(tenantId, logId) {
      return prepareRollbackCore(deps.history, deps.runItems, tenantId, logId);
    },
    executeRollback(tenantId, logId, requestedBy, onRevertItem) {
      return executeRollbackCore(
        deps.history,
        deps.runItems,
        recordEvent,
        tenantId,
        logId,
        requestedBy,
        onRevertItem,
      );
    },
  };
}
