/**
 * Sprint 22.5.1 — Histórico de importações (multi-módulo).
 * Sprint 22.6 — paginação, busca por id e marcação de rollback.
 * In-memory por padrão; um adapter durável (Supabase) pode substituir
 * a implementação sem alterar `ImportEngineService` ou os adapters de módulo.
 */
import type { ImportHistoryEntry } from "../types/index.ts";

export type ImportHistoryListPageOptions = {
  module?: string;
  status?: ImportHistoryEntry["status"];
  limit?: number;
  offset?: number;
};

export type ImportHistoryListPageResult = {
  items: ImportHistoryEntry[];
  total: number;
};

export interface ImportHistoryStore {
  list(tenantId: string, module?: string, limit?: number): Promise<ImportHistoryEntry[]>;
  append(
    entry: Omit<ImportHistoryEntry, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    },
  ): Promise<ImportHistoryEntry>;
  getById(tenantId: string, id: string): Promise<ImportHistoryEntry | null>;
  listPage(
    tenantId: string,
    options?: ImportHistoryListPageOptions,
  ): Promise<ImportHistoryListPageResult>;
  markRolledBack(tenantId: string, id: string): Promise<ImportHistoryEntry | null>;
}

export class MemoryImportHistoryStore implements ImportHistoryStore {
  private entries: ImportHistoryEntry[] = [];

  async list(tenantId: string, module?: string, limit = 20) {
    return this.entries
      .filter(
        (e) =>
          e.tenantId === tenantId && (!module || e.module === module),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async append(
    entry: Omit<ImportHistoryEntry, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    },
  ) {
    const full: ImportHistoryEntry = {
      origin: "upload",
      engineVersion: "22.6",
      ...entry,
      id: entry.id ?? `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: entry.createdAt ?? new Date().toISOString(),
    };
    this.entries.unshift(full);
    if (this.entries.length > 500) this.entries.length = 500;
    return full;
  }

  async getById(tenantId: string, id: string) {
    return (
      this.entries.find((e) => e.tenantId === tenantId && e.id === id) ?? null
    );
  }

  async listPage(tenantId: string, options: ImportHistoryListPageOptions = {}) {
    const filtered = this.entries
      .filter(
        (e) =>
          e.tenantId === tenantId &&
          (!options.module || e.module === options.module) &&
          (!options.status || e.status === options.status),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    return {
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  async markRolledBack(tenantId: string, id: string) {
    const entry = this.entries.find(
      (e) => e.tenantId === tenantId && e.id === id,
    );
    if (!entry) return null;
    entry.status = "rolled_back";
    entry.rolledBackAt = new Date().toISOString();
    return entry;
  }
}

let singleton: MemoryImportHistoryStore | null = null;

export function getGlobalMemoryHistoryStore() {
  if (!singleton) singleton = new MemoryImportHistoryStore();
  return singleton;
}
