/**
 * Fase 25 — Feature flags Supply Chain / Compras / Estoque Enterprise.
 */

function envFlag(name: string, defaultOn = false): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return defaultOn;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function isSupplyEnterpriseEnabled(): boolean {
  return envFlag("SUPPLY_ENTERPRISE_ENABLED", true);
}

export function isSupplyExternalAiEnabled(): boolean {
  return envFlag("SUPPLY_EXTERNAL_AI_ENABLED", false);
}

export function isSupplyExternalIntegrationsEnabled(): boolean {
  return envFlag("SUPPLY_EXTERNAL_INTEGRATIONS_ENABLED", false);
}

export function getSupplyFeatureFlags() {
  return {
    enterprise: isSupplyEnterpriseEnabled(),
    externalAi: isSupplyExternalAiEnabled(),
    externalIntegrations: isSupplyExternalIntegrationsEnabled(),
  };
}
