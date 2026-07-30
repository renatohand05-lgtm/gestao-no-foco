/**
 * Sprint 22.6 / 22.10 / 22.10.1 — Ponto único de criação da Import Engine.
 *
 * - `createProductionImportEngine(client)` — produção; sem fallback silencioso.
 * - `createImportEngine(client?)` — dev/test; memória só se ALLOW_IMPORT_MEMORY ou não-produção.
 * - `createMemoryImportEngineBundle` — testes / staging explícito.
 */
import type { EnterpriseSupabaseClient } from "../../enterprise/adapters/supabase-helpers.ts";
import { ImportEngineService } from "../services/import-engine-service.ts";
import { getGlobalMemoryHistoryStore } from "../history/import-history-store.ts";
import { getGlobalMemoryRunItemsStore } from "../history/run-items-store.ts";
import { getGlobalMemoryMappingStore } from "../mapping/mapping-store.ts";
import { getGlobalMemoryLearningStore } from "../learning/learning-store.ts";
import { getGlobalMemoryRollbackStore } from "../rollback/rollback-store.ts";
import {
  createSupabaseImportEngine,
  type ImportEngineBundle,
} from "./create-supabase-import-engine.ts";
import {
  assertImportMemoryUsageAllowed,
  isImportMemoryExplicitlyAllowed,
  isImportProductionRuntime,
} from "./memory-policy.ts";

export function createMemoryImportEngineBundle(
  explicitReason?: string,
): ImportEngineBundle {
  assertImportMemoryUsageAllowed(explicitReason);
  const history = getGlobalMemoryHistoryStore();
  const mapping = getGlobalMemoryMappingStore();
  const learning = getGlobalMemoryLearningStore();
  const runItems = getGlobalMemoryRunItemsStore();
  const rollback = getGlobalMemoryRollbackStore();
  const engine = new ImportEngineService(mapping, history);

  return { engine, history, mapping, learning, runItems, rollback };
}

/**
 * Produção — exige client Supabase; erros de persistência propagam.
 * Não há fallback silencioso para memória (paridade com conciliação bancária).
 */
export function createProductionImportEngine(
  client: EnterpriseSupabaseClient,
): ImportEngineBundle {
  if (!client) {
    throw new Error(
      "Import Engine: client Supabase obrigatório em produção. " +
        "Não há fallback silencioso para memória.",
    );
  }
  return createSupabaseImportEngine(client);
}

/**
 * @param client client Supabase autenticado (server-side).
 * Em produção, sem client ou com falha de bootstrap Supabase, lança erro
 * (exceto ALLOW_IMPORT_MEMORY=1).
 */
export function createImportEngine(
  client?: EnterpriseSupabaseClient | null,
): ImportEngineBundle {
  if (!client) {
    if (isImportProductionRuntime() && !isImportMemoryExplicitlyAllowed()) {
      throw new Error(
        "Import Engine: client Supabase obrigatório em produção. " +
          "Não há fallback silencioso para memória.",
      );
    }
    return createMemoryImportEngineBundle("dev_or_test_without_client");
  }
  try {
    return createSupabaseImportEngine(client);
  } catch (err) {
    if (isImportProductionRuntime() && !isImportMemoryExplicitlyAllowed()) {
      throw err instanceof Error
        ? err
        : new Error("Falha ao inicializar Import Engine Supabase.");
    }
    return createMemoryImportEngineBundle(
      "explicit_dev_fallback_after_supabase_error",
    );
  }
}
