/**
 * Sprint 25.4.2 — Extensão do histórico: arquivar / soft-delete / restaurar.
 */

import type { ImportHistoryEntry } from "../types/index.ts";
import {
  applyHistoryLifecycle,
  isHistoryVisible,
  type HistoryVisibilityFilter,
} from "./history-lifecycle.ts";
import type {
  ImportHistoryListPageOptions,
  ImportHistoryListPageResult,
  ImportHistoryStore,
} from "../history/import-history-store.ts";

export type ImportHistoryLifecycleStore = ImportHistoryStore & {
  archive(
    tenantId: string,
    id: string,
    userId: string,
    reason: string,
  ): Promise<ImportHistoryEntry | null>;
  restoreArchive(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<ImportHistoryEntry | null>;
  softDeleteHistory(
    tenantId: string,
    id: string,
    userId: string,
    reason: string,
  ): Promise<ImportHistoryEntry | null>;
  restoreSoftDelete(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<ImportHistoryEntry | null>;
  listPageVisible(
    tenantId: string,
    options?: ImportHistoryListPageOptions & {
      visibility?: HistoryVisibilityFilter;
    },
  ): Promise<ImportHistoryListPageResult>;
};

export function extendHistoryStoreWithLifecycle(
  base: ImportHistoryStore & {
    /** Mutação direta opcional (memory). */
    _mutate?: (
      tenantId: string,
      id: string,
      fn: (e: ImportHistoryEntry) => ImportHistoryEntry,
    ) => Promise<ImportHistoryEntry | null>;
  },
): ImportHistoryLifecycleStore {
  async function mutate(
    tenantId: string,
    id: string,
    fn: (e: ImportHistoryEntry) => ImportHistoryEntry,
  ) {
    if (base._mutate) return base._mutate(tenantId, id, fn);
    const current = await base.getById(tenantId, id);
    if (!current) return null;
    return fn(current);
  }

  return {
    ...base,
    async archive(tenantId, id, userId, reason) {
      return mutate(tenantId, id, (e) =>
        applyHistoryLifecycle(e, "archive", { userId, reason }),
      );
    },
    async restoreArchive(tenantId, id, userId) {
      return mutate(tenantId, id, (e) =>
        applyHistoryLifecycle(e, "restore_archive", {
          userId: userId ?? "system",
          reason: "restore",
        }),
      );
    },
    async softDeleteHistory(tenantId, id, userId, reason) {
      return mutate(tenantId, id, (e) =>
        applyHistoryLifecycle(e, "soft_delete_history", { userId, reason }),
      );
    },
    async restoreSoftDelete(tenantId, id, userId) {
      return mutate(tenantId, id, (e) =>
        applyHistoryLifecycle(e, "restore_soft_delete", {
          userId: userId ?? "system",
          reason: "restore",
        }),
      );
    },
    async listPageVisible(tenantId, options = {}) {
      const visibility = options.visibility ?? "active";
      const page = await base.listPage(tenantId, {
        module: options.module,
        status: options.status,
        limit: 500,
        offset: 0,
      });
      const filtered = page.items.filter((e) =>
        isHistoryVisible(e, visibility),
      );
      const limit = options.limit ?? 20;
      const offset = options.offset ?? 0;
      return {
        items: filtered.slice(offset, offset + limit),
        total: filtered.length,
      };
    },
  };
}
