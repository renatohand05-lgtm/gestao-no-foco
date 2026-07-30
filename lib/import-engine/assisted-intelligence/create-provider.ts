/**
 * Sprint 22.7 — Factory do provider ativo.
 * Sem provider externo configurado → determinístico + atribuição de regras/histórico.
 */

import { createDeterministicProvider } from "./deterministic-provider.ts";
import {
  createExternalProviderStub,
  isExternalIntelligenceConfigured,
  type ExternalProviderConfig,
} from "./external-provider-stub.ts";
import { createMockProvider } from "./mock-provider.ts";
import type { FinancialIntelligenceProvider } from "./provider.ts";

export type CreateIntelligenceProviderOptions = {
  mode?: "deterministic" | "mock" | "external";
  mockCategory?: string;
  external?: ExternalProviderConfig;
};

export function createFinancialIntelligenceProvider(
  options: CreateIntelligenceProviderOptions = {},
): FinancialIntelligenceProvider {
  const mode = options.mode ?? "deterministic";
  if (mode === "mock") return createMockProvider(options.mockCategory);
  if (mode === "external") {
    if (!isExternalIntelligenceConfigured(options.external)) {
      return createDeterministicProvider();
    }
    // Externo ainda não implementado — stub sem simular IA
    return createExternalProviderStub(options.external);
  }
  return createDeterministicProvider();
}
