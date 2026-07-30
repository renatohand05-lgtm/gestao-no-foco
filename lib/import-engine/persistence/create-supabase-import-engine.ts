/**
 * Sprint 22.6 — Compõe os adapters Supabase da Import Engine.
 */
import type { EnterpriseSupabaseClient } from "../../enterprise/adapters/supabase-helpers.ts";
import { ImportEngineService } from "../services/import-engine-service.ts";
import type { ImportHistoryStore } from "../history/import-history-store.ts";
import type { ImportRunItemsStore } from "../history/run-items-store.ts";
import type { ImportMappingStore } from "../mapping/mapping-store.ts";
import type { ImportLearningStore } from "../learning/learning-store.ts";
import type { ImportRollbackStore } from "../rollback/rollback-store.ts";
import { createSupabaseHistoryStore } from "./supabase-history-store.ts";
import { createSupabaseMappingStore } from "./supabase-mapping-store.ts";
import { createSupabaseLearningStore } from "./supabase-learning-store.ts";
import { createSupabaseRunItemsStore } from "./supabase-run-items-store.ts";
import { createSupabaseRollbackStore } from "./supabase-rollback-store.ts";

export type ImportEngineBundle = {
  engine: ImportEngineService;
  history: ImportHistoryStore;
  mapping: ImportMappingStore;
  learning: ImportLearningStore;
  runItems: ImportRunItemsStore;
  rollback: ImportRollbackStore;
};

export function createSupabaseImportEngine(
  client: EnterpriseSupabaseClient,
): ImportEngineBundle {
  const history = createSupabaseHistoryStore(client);
  const mapping = createSupabaseMappingStore(client);
  const learning = createSupabaseLearningStore(client);
  const runItems = createSupabaseRunItemsStore(client);
  const rollback = createSupabaseRollbackStore(client, { history, runItems });
  const engine = new ImportEngineService(mapping, history);

  return { engine, history, mapping, learning, runItems, rollback };
}
