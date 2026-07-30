/**
 * Sprint 22.6 — Rollback funcional (em memória por padrão).
 *
 * Regra crítica de segurança: **nenhum rollback pode afetar importações
 * posteriores**. Um run só é elegível se não existir, no mesmo tenant e
 * módulo, uma importação concluída (completed/partial) mais recente do que
 * ele. A lógica de elegibilidade vive em funções puras (`canRollbackCore`,
 * `prepareRollbackCore`, `executeRollbackCore`) reutilizadas pelo adapter
 * Supabase (`persistence/supabase-rollback-store.ts`) — a garantia de
 * segurança é a mesma nos dois ambientes.
 */
import {
  getGlobalMemoryHistoryStore,
  type ImportHistoryStore,
} from "../history/import-history-store.ts";
import {
  getGlobalMemoryRunItemsStore,
  type ImportRunItemsStore,
} from "../history/run-items-store.ts";
import type { ImportRollbackPlan, ImportRunItem } from "../types/index.ts";

export type ImportRollbackEventStatus =
  | "eligible"
  | "in_progress"
  | "done"
  | "failed"
  | "not_supported";

export type ImportRollbackEvent = {
  id: string;
  tenantId: string;
  runId: string;
  status: ImportRollbackEventStatus;
  affectedRows: number;
  reason: string | null;
  requestedBy: string;
  completedAt: string | null;
  createdAt: string;
};

export type RecordRollbackEvent = (event: {
  tenantId: string;
  runId: string;
  status: ImportRollbackEventStatus;
  affectedRows: number;
  reason: string | null;
  requestedBy: string;
  completedAt: string | null;
}) => Promise<void>;

export interface ImportRollbackStore {
  /** Analisa um log de importação e devolve se é hoje elegível para rollback. */
  canRollback(tenantId: string, logId: string): Promise<boolean>;
  /** Prepara (sem executar) o plano de rollback de um log de importação. */
  prepareRollback(tenantId: string, logId: string): Promise<ImportRollbackPlan>;
  /** Executa o rollback, revertendo cada item pendente via `onRevertItem`. */
  executeRollback(
    tenantId: string,
    logId: string,
    requestedBy: string,
    onRevertItem: (item: ImportRunItem) => Promise<void>,
  ): Promise<ImportRollbackPlan>;
}

async function findLaterCompletedRun(
  history: ImportHistoryStore,
  tenantId: string,
  module: string,
  createdAt: string,
  excludeId: string,
) {
  const list = await history.list(tenantId, module, 1000);
  return (
    list.find(
      (e) =>
        e.id !== excludeId &&
        e.createdAt > createdAt &&
        (e.status === "completed" || e.status === "partial"),
    ) ?? null
  );
}

export async function canRollbackCore(
  history: ImportHistoryStore,
  runItems: ImportRunItemsStore,
  tenantId: string,
  logId: string,
): Promise<boolean> {
  const run = await history.getById(tenantId, logId);
  if (!run) return false;
  if (run.status !== "completed" && run.status !== "partial") return false;
  const items = await runItems.listByRun(tenantId, logId);
  if (!items.some((i) => i.rollbackStatus === "pending")) return false;
  const later = await findLaterCompletedRun(
    history,
    tenantId,
    run.module,
    run.createdAt,
    run.id,
  );
  return !later;
}

export async function prepareRollbackCore(
  history: ImportHistoryStore,
  runItems: ImportRunItemsStore,
  tenantId: string,
  logId: string,
): Promise<ImportRollbackPlan> {
  const now = new Date().toISOString();
  const run = await history.getById(tenantId, logId);
  if (!run) {
    return {
      logId,
      module: "unknown",
      status: "not_supported",
      affectedRows: 0,
      reason: "Importação não encontrada.",
      createdAt: now,
      items: [],
    };
  }

  if (run.status === "rolled_back") {
    return {
      logId,
      module: run.module,
      status: "done",
      affectedRows: 0,
      reason: "Esta importação já foi revertida anteriormente.",
      createdAt: now,
      items: [],
    };
  }

  const items = await runItems.listByRun(tenantId, logId);
  const pending = items.filter((i) => i.rollbackStatus === "pending");

  if (!pending.length) {
    return {
      logId,
      module: run.module,
      status: "not_supported",
      affectedRows: 0,
      reason: "Não há registos pendentes de reversão para esta importação.",
      createdAt: now,
      items: [],
    };
  }

  const later = await findLaterCompletedRun(
    history,
    tenantId,
    run.module,
    run.createdAt,
    run.id,
  );
  if (later) {
    return {
      logId,
      module: run.module,
      status: "not_supported",
      affectedRows: pending.length,
      reason: `Existe uma importação mais recente ("${later.fileName}") no mesmo módulo. Nenhum rollback pode afetar importações posteriores — reverta-as primeiro, na ordem inversa.`,
      createdAt: now,
      items: pending,
    };
  }

  return {
    logId,
    module: run.module,
    status: "eligible",
    affectedRows: pending.length,
    reason: "Rollback disponível — nenhuma importação posterior no mesmo módulo.",
    createdAt: now,
    items: pending,
  };
}

export async function executeRollbackCore(
  history: ImportHistoryStore,
  runItems: ImportRunItemsStore,
  recordEvent: RecordRollbackEvent,
  tenantId: string,
  logId: string,
  requestedBy: string,
  onRevertItem: (item: ImportRunItem) => Promise<void>,
): Promise<ImportRollbackPlan> {
  const plan = await prepareRollbackCore(history, runItems, tenantId, logId);
  if (plan.status !== "eligible") {
    await recordEvent({
      tenantId,
      runId: logId,
      status: plan.status === "done" ? "done" : "failed",
      affectedRows: 0,
      reason: plan.reason,
      requestedBy,
      completedAt: new Date().toISOString(),
    });
    return plan;
  }

  const run = await history.getById(tenantId, logId);
  if (!run) {
    throw new Error("Importação não encontrada.");
  }

  await recordEvent({
    tenantId,
    runId: logId,
    status: "in_progress",
    affectedRows: plan.affectedRows,
    reason: null,
    requestedBy,
    completedAt: null,
  });

  // Reverte na ordem inversa das linhas (última linha importada primeiro).
  const ordered = [...(plan.items ?? [])].sort((a, b) => b.rowNumber - a.rowNumber);
  const reverted: string[] = [];
  const failures: Array<{ targetId: string; error: string }> = [];

  for (const item of ordered) {
    try {
      await onRevertItem(item);
      reverted.push(item.targetId);
    } catch (error) {
      failures.push({
        targetId: item.targetId,
        error: error instanceof Error ? error.message : "Falha ao reverter registo.",
      });
    }
  }

  if (reverted.length) {
    await runItems.markReverted(tenantId, logId, reverted);
  }

  const success = failures.length === 0;
  if (success) {
    await history.markRolledBack(tenantId, logId);
  }

  const now = new Date().toISOString();
  const reason = success
    ? "Rollback concluído com sucesso."
    : `Rollback parcial — ${failures.length} de ${ordered.length} registo(s) não puderam ser revertidos: ${failures
        .map((f) => f.error)
        .join("; ")}`;

  await recordEvent({
    tenantId,
    runId: logId,
    status: success ? "done" : "failed",
    affectedRows: reverted.length,
    reason: success ? null : reason,
    requestedBy,
    completedAt: now,
  });

  return {
    logId,
    module: run.module,
    status: success ? "done" : "failed",
    affectedRows: reverted.length,
    reason,
    createdAt: now,
    items: ordered,
  };
}

export type MemoryRollbackStoreDeps = {
  history?: ImportHistoryStore;
  runItems?: ImportRunItemsStore;
};

/**
 * Store funcional em memória — implementa a mesma lógica de segurança que o
 * adapter Supabase (persistence/supabase-rollback-store.ts).
 */
export class MemoryImportRollbackStore implements ImportRollbackStore {
  private history: ImportHistoryStore;
  private runItems: ImportRunItemsStore;
  private events: ImportRollbackEvent[] = [];

  constructor(deps: MemoryRollbackStoreDeps = {}) {
    this.history = deps.history ?? getGlobalMemoryHistoryStore();
    this.runItems = deps.runItems ?? getGlobalMemoryRunItemsStore();
  }

  private recordEvent: RecordRollbackEvent = async (event) => {
    this.events.push({
      id: `rbe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...event,
    });
  };

  canRollback(tenantId: string, logId: string) {
    return canRollbackCore(this.history, this.runItems, tenantId, logId);
  }

  prepareRollback(tenantId: string, logId: string) {
    return prepareRollbackCore(this.history, this.runItems, tenantId, logId);
  }

  executeRollback(
    tenantId: string,
    logId: string,
    requestedBy: string,
    onRevertItem: (item: ImportRunItem) => Promise<void>,
  ) {
    return executeRollbackCore(
      this.history,
      this.runItems,
      this.recordEvent,
      tenantId,
      logId,
      requestedBy,
      onRevertItem,
    );
  }

  listEvents(tenantId: string, runId?: string): ImportRollbackEvent[] {
    return this.events.filter(
      (e) => e.tenantId === tenantId && (!runId || e.runId === runId),
    );
  }
}

let singleton: MemoryImportRollbackStore | null = null;

export function getGlobalMemoryRollbackStore() {
  if (!singleton) {
    singleton = new MemoryImportRollbackStore({
      history: getGlobalMemoryHistoryStore(),
      runItems: getGlobalMemoryRunItemsStore(),
    });
  }
  return singleton;
}
