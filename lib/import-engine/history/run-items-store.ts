/**
 * Sprint 22.6 — Itens criados por run de importação (âncora do rollback).
 * Cada linha confirmada e persistida gera um `ImportRunItem` apontando para
 * o registo real criado no módulo consumidor (ex.: `cash_movement`).
 */
import type { ImportRunItem, ImportRunItemRollbackStatus } from "../types/index.ts";

export type AppendImportRunItemInput = {
  id?: string;
  tenantId: string;
  runId: string;
  rowNumber: number;
  targetType: string;
  targetId: string;
  operation?: string;
  payloadSnapshot?: Record<string, unknown> | null;
  rollbackStatus?: ImportRunItemRollbackStatus;
  createdAt?: string;
};

export interface ImportRunItemsStore {
  appendMany(items: AppendImportRunItemInput[]): Promise<ImportRunItem[]>;
  listByRun(tenantId: string, runId: string): Promise<ImportRunItem[]>;
  markReverted(
    tenantId: string,
    runId: string,
    targetIds: string[],
  ): Promise<void>;
}

export class MemoryImportRunItemsStore implements ImportRunItemsStore {
  private items: ImportRunItem[] = [];

  async appendMany(items: AppendImportRunItemInput[]) {
    if (!items.length) return [];
    const now = new Date().toISOString();
    const created = items.map((it): ImportRunItem => ({
      id: it.id ?? `rit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: it.tenantId,
      runId: it.runId,
      rowNumber: it.rowNumber,
      targetType: it.targetType,
      targetId: it.targetId,
      operation: it.operation ?? "create",
      payloadSnapshot: it.payloadSnapshot ?? null,
      rollbackStatus: it.rollbackStatus ?? "pending",
      createdAt: it.createdAt ?? now,
    }));
    this.items.push(...created);
    return created;
  }

  async listByRun(tenantId: string, runId: string) {
    return this.items
      .filter((i) => i.tenantId === tenantId && i.runId === runId)
      .sort((a, b) => a.rowNumber - b.rowNumber);
  }

  async markReverted(tenantId: string, runId: string, targetIds: string[]) {
    const set = new Set(targetIds);
    for (const item of this.items) {
      if (
        item.tenantId === tenantId &&
        item.runId === runId &&
        set.has(item.targetId)
      ) {
        item.rollbackStatus = "reverted";
      }
    }
  }
}

let singleton: MemoryImportRunItemsStore | null = null;

export function getGlobalMemoryRunItemsStore() {
  if (!singleton) singleton = new MemoryImportRunItemsStore();
  return singleton;
}
