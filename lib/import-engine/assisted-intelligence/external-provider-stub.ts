/**
 * Sprint 22.7 — Stub de provider externo futuro.
 * Sem credenciais / configuração → não ativo; nunca simula resposta de IA.
 */

import type { FinancialIntelligenceProvider } from "./provider.ts";
import { DETERMINISTIC_ATTRIBUTION } from "./provider.ts";
import { createDeterministicProvider } from "./deterministic-provider.ts";

export type ExternalProviderConfig = {
  apiKey?: string | null;
  endpoint?: string | null;
  enabled?: boolean;
};

export function isExternalIntelligenceConfigured(config?: ExternalProviderConfig): boolean {
  return Boolean(
    config?.enabled &&
      config.apiKey &&
      config.apiKey.trim() &&
      config.endpoint &&
      config.endpoint.trim(),
  );
}

/**
 * Interface reservada. Sem config válida, devolve o determinístico
 * e a atribuição explícita de regras/histórico (nunca como IA externa).
 */
export class ExternalIntelligenceProviderStub implements FinancialIntelligenceProvider {
  readonly meta = {
    id: "external-stub",
    label: "Provider externo (não configurado)",
    isExternalAi: false,
    attribution: DETERMINISTIC_ATTRIBUTION,
  } as const;

  private fallback = createDeterministicProvider();

  constructor(_config?: ExternalProviderConfig) {
    if (isExternalIntelligenceConfigured(_config)) {
      // Config presente mas implementação externa ainda não liberada (feature flag).
      // Não inventar respostas de IA.
    }
  }

  get isActiveExternal(): boolean {
    return false;
  }

  detectDocument(input: Parameters<FinancialIntelligenceProvider["detectDocument"]>[0]) {
    return this.fallback.detectDocument(input);
  }

  interpretDre(lines: Parameters<FinancialIntelligenceProvider["interpretDre"]>[0]) {
    return this.fallback.interpretDre(lines);
  }

  interpretPayroll(input: Parameters<FinancialIntelligenceProvider["interpretPayroll"]>[0]) {
    return this.fallback.interpretPayroll(input);
  }

  suggestClassification(
    row: Parameters<FinancialIntelligenceProvider["suggestClassification"]>[0],
    ctx?: Parameters<FinancialIntelligenceProvider["suggestClassification"]>[1],
  ) {
    return this.fallback.suggestClassification(row, ctx);
  }

  classify(
    row: Parameters<FinancialIntelligenceProvider["classify"]>[0],
    ctx?: Parameters<FinancialIntelligenceProvider["classify"]>[1],
  ) {
    return this.fallback.classify(row, ctx);
  }
}

export function createExternalProviderStub(
  config?: ExternalProviderConfig,
): FinancialIntelligenceProvider {
  return new ExternalIntelligenceProviderStub(config);
}
