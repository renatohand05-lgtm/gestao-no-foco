/**
 * Sprint 26.7 — Feature flags Tax Intelligence.
 * Default: módulo habilitado; integrações externas e IA externa OFF.
 */

function envFlag(name: string, defaultOn = false): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return defaultOn;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Módulo Enterprise Tax Intelligence (UI + engine). Default on. */
export function isTaxIntelligenceEnabled(): boolean {
  return envFlag("TAX_INTELLIGENCE_ENABLED", true);
}

/** Conectores ERP/fiscais externos — arquitetura apenas. Default off. */
export function isTaxExternalIntegrationsEnabled(): boolean {
  return envFlag("TAX_EXTERNAL_INTEGRATIONS_ENABLED", false);
}

/** Provider de IA externo. Default off — usa camada determinística. */
export function isTaxExternalAiEnabled(): boolean {
  return envFlag("TAX_EXTERNAL_AI_ENABLED", false);
}

export function getTaxFeatureFlags() {
  return {
    taxIntelligence: isTaxIntelligenceEnabled(),
    externalIntegrations: isTaxExternalIntegrationsEnabled(),
    externalAi: isTaxExternalAiEnabled(),
  };
}
