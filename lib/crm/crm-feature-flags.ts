/**
 * Fase 24 — Feature flags CRM Enterprise.
 */

function envFlag(name: string, defaultOn = false): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return defaultOn;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function isCrmEnterpriseEnabled(): boolean {
  return envFlag("CRM_ENTERPRISE_ENABLED", true);
}

export function isCrmExternalAiEnabled(): boolean {
  return envFlag("CRM_EXTERNAL_AI_ENABLED", false);
}

export function isCrmExternalIntegrationsEnabled(): boolean {
  return envFlag("CRM_EXTERNAL_INTEGRATIONS_ENABLED", false);
}

export function getCrmFeatureFlags() {
  return {
    enterprise: isCrmEnterpriseEnabled(),
    externalAi: isCrmExternalAiEnabled(),
    externalIntegrations: isCrmExternalIntegrationsEnabled(),
  };
}
