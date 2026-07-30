/**
 * Sprint 25.4.2 — Lifecycle do histórico (arquivar / soft-delete / restaurar).
 * Funções puras + helpers de filtro. Sem hard delete por padrão.
 */

import type { ImportHistoryEntry } from "../types/index.ts";

export type HistoryLifecycleAction =
  | "archive"
  | "restore_archive"
  | "soft_delete_history"
  | "restore_soft_delete";

export type HistoryVisibilityFilter = "active" | "archived" | "deleted" | "all";

export function isHistoryVisible(
  entry: Pick<
    ImportHistoryEntry,
    "archivedAt" | "deletedAt"
  >,
  filter: HistoryVisibilityFilter = "active",
): boolean {
  const archived = Boolean(entry.archivedAt);
  const deleted = Boolean(entry.deletedAt);
  if (filter === "all") return true;
  if (filter === "archived") return archived && !deleted;
  if (filter === "deleted") return deleted;
  return !archived && !deleted;
}

export function applyHistoryLifecycle(
  entry: ImportHistoryEntry,
  action: HistoryLifecycleAction,
  meta: { userId: string; reason: string; at?: string },
): ImportHistoryEntry {
  const at = meta.at ?? new Date().toISOString();
  const next = { ...entry };

  switch (action) {
    case "archive":
      if (next.deletedAt) {
        throw new Error("Não é possível arquivar um histórico já excluído (soft).");
      }
      if (next.archivedAt) {
        throw new Error("Histórico já arquivado.");
      }
      next.archivedAt = at;
      next.archivedBy = meta.userId;
      next.deleteReason = meta.reason;
      break;
    case "restore_archive":
      if (!next.archivedAt) {
        throw new Error("Histórico não está arquivado.");
      }
      next.archivedAt = null;
      next.archivedBy = null;
      break;
    case "soft_delete_history":
      if (next.deletedAt) {
        throw new Error("Histórico já excluído da lista (soft-delete).");
      }
      next.deletedAt = at;
      next.deletedBy = meta.userId;
      next.deleteReason = meta.reason;
      break;
    case "restore_soft_delete":
      if (!next.deletedAt) {
        throw new Error("Histórico não está em soft-delete.");
      }
      next.deletedAt = null;
      next.deletedBy = null;
      break;
    default:
      throw new Error("Ação de lifecycle inválida.");
  }

  return next;
}

/** Soft-delete do histórico NUNCA remove dados operacionais. */
export function historySoftDeleteAffectsOperationalData(): false {
  return false;
}
