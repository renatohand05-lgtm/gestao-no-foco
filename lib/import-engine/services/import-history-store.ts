/**
 * Sprint 22.5.1 — Compatibilidade. Implementação movida para `history/`.
 * Mantido apenas para não quebrar imports existentes.
 * @deprecated importe de `lib/import-engine/history` ou do índice principal.
 */
export {
  MemoryImportHistoryStore,
  getGlobalMemoryHistoryStore,
  type ImportHistoryStore,
} from "../history/import-history-store.ts";
