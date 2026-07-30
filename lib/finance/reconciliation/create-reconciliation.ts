/**
 * Sprint 22.6.2.1 — Factory: produção = Supabase; memória só com flag explícita.
 * Nunca faz fallback silencioso quando client Supabase é fornecido.
 */

import type { EnterpriseSupabaseClient } from "../../enterprise/adapters/supabase-helpers.ts";
import {
  createMemoryReconciliationRepository,
  getGlobalMemoryReconciliationRepository,
} from "./memory-reconciliation-repository.ts";
import { createSupabaseReconciliationRepository } from "./supabase-reconciliation-repository.ts";
import { createReconciliationService } from "./reconciliation-service.ts";
import type { ReconciliationRepository } from "./reconciliation-repository.ts";

export type ReconciliationBackend = "supabase" | "memory";

/**
 * @param client Client autenticado — obrigatório para produção.
 * @param options.backend "memory" apenas para testes / ambientes sem DB.
 *        Se `client` for passado com backend supabase (default), erros de
 *        persistência propagam — sem cair para memória.
 */
export function createReconciliationBackend(
  client?: EnterpriseSupabaseClient | null,
  options?: { backend?: ReconciliationBackend },
) {
  const backend = options?.backend ?? (client ? "supabase" : "memory");

  if (backend === "memory") {
    const repo =
      options?.backend === "memory"
        ? createMemoryReconciliationRepository()
        : getGlobalMemoryReconciliationRepository();
    return {
      backend: "memory" as const,
      repository: repo,
      service: createReconciliationService(repo),
    };
  }

  if (!client) {
    throw new Error(
      "Conciliação bancária: client Supabase obrigatório em produção. " +
        "Não há fallback silencioso para memória.",
    );
  }

  const repo = createSupabaseReconciliationRepository(client);
  return {
    backend: "supabase" as const,
    repository: repo,
    service: createReconciliationService(repo),
  };
}

export function createProductionReconciliationService(
  client: EnterpriseSupabaseClient,
) {
  return createReconciliationBackend(client, { backend: "supabase" }).service;
}

export function createTestReconciliationService(
  repo?: ReconciliationRepository,
) {
  const repository = repo ?? createMemoryReconciliationRepository();
  return createReconciliationService(repository);
}
