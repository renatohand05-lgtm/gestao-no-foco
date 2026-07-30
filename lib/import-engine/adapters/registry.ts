/**
 * Sprint 22.5.1 — Registo central dos adapters de módulo.
 * Ponto único de descoberta: `getImportAdapter(id)` / `listImportAdapters()`.
 */
import type { ImportModuleId } from "../types/index.ts";
import type { ModuleImportAdapter } from "./shared/module-adapter.ts";
import { CATALOG_IMPORT_ADAPTER } from "./catalog/adapter.ts";
import { FINANCE_IMPORT_ADAPTER } from "./finance/adapter.ts";
import { INVOICE_IMPORT_ADAPTER } from "./invoice/adapter.ts";
import { SALES_IMPORT_ADAPTER } from "./sales/adapter.ts";
import { SERVICE_ORDERS_IMPORT_ADAPTER } from "./service-orders/adapter.ts";
import { STOCK_IMPORT_ADAPTER } from "./stock/adapter.ts";

const REGISTRY: Record<ImportModuleId, ModuleImportAdapter> = {
  finance: FINANCE_IMPORT_ADAPTER,
  sales: SALES_IMPORT_ADAPTER,
  "service-orders": SERVICE_ORDERS_IMPORT_ADAPTER,
  catalog: CATALOG_IMPORT_ADAPTER,
  stock: STOCK_IMPORT_ADAPTER,
  invoice: INVOICE_IMPORT_ADAPTER,
};

export function getImportAdapter(id: ImportModuleId): ModuleImportAdapter {
  const adapter = REGISTRY[id];
  if (!adapter) {
    throw new Error(`Adapter de importação desconhecido: ${id}`);
  }
  return adapter;
}

export function listImportAdapters(): ModuleImportAdapter[] {
  return Object.values(REGISTRY);
}
