/**
 * Sprint 26.8+ — Feature flags tributárias.
 */

export function getTaxAdminFeatureFlags() {
  return {
    taxAdminEnabled: process.env.TAX_ADMIN_ENABLED !== "0",
    taxSimulationEnabled: process.env.TAX_SIMULATION_ENABLED !== "0",
    taxExecutiveEnabled: process.env.TAX_EXECUTIVE_ENABLED !== "0",
    taxExternalIntegrationsEnabled:
      process.env.TAX_EXTERNAL_INTEGRATIONS_ENABLED === "1",
    taxExternalAiEnabled: process.env.TAX_EXTERNAL_AI_ENABLED === "1",
  };
}
