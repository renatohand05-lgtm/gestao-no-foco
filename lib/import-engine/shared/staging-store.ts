/**
 * Sprint 22.5.1 — Staging genérico para módulos sem persistência definitiva
 * ainda ligada à engine (Vendas, Ordens de Serviço). As linhas confirmadas
 * ficam registadas aqui e no histórico — a criação de registos reais nesses
 * módulos será ligada aos services existentes numa sprint seguinte, para
 * não inventar regras de negócio agora.
 */
import type { ImportModuleId, ImportReviewRow } from "../types/index.ts";

export type StagedImportRow = {
  id: string;
  tenantId: string;
  module: ImportModuleId;
  logId: string;
  rowNumber: number;
  values: Record<string, unknown>;
  createdAt: string;
};

export interface ImportStagingStore {
  stage(input: {
    tenantId: string;
    module: ImportModuleId;
    logId: string;
    row: ImportReviewRow;
  }): Promise<StagedImportRow>;
  list(
    tenantId: string,
    module: ImportModuleId,
    logId?: string,
  ): Promise<StagedImportRow[]>;
}

export class MemoryImportStagingStore implements ImportStagingStore {
  private rows: StagedImportRow[] = [];

  async stage(input: {
    tenantId: string;
    module: ImportModuleId;
    logId: string;
    row: ImportReviewRow;
  }): Promise<StagedImportRow> {
    const staged: StagedImportRow = {
      id: `stg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: input.tenantId,
      module: input.module,
      logId: input.logId,
      rowNumber: input.row.rowNumber,
      values: input.row.values,
      createdAt: new Date().toISOString(),
    };
    this.rows.push(staged);
    if (this.rows.length > 10_000) {
      this.rows.splice(0, this.rows.length - 10_000);
    }
    return staged;
  }

  async list(tenantId: string, module: ImportModuleId, logId?: string) {
    return this.rows.filter(
      (r) =>
        r.tenantId === tenantId &&
        r.module === module &&
        (!logId || r.logId === logId),
    );
  }
}

const singletons = new Map<ImportModuleId, MemoryImportStagingStore>();

export function getGlobalMemoryStagingStore(
  module: ImportModuleId,
): MemoryImportStagingStore {
  let store = singletons.get(module);
  if (!store) {
    store = new MemoryImportStagingStore();
    singletons.set(module, store);
  }
  return store;
}
