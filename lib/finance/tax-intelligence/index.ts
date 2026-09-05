/**
 * Sprint 26.7 — Enterprise Tax Intelligence · API pública.
 */

export type * from "./types.ts";
export {
  roundMoney,
  todayUtc,
  addMonths,
  periodKey,
  safeRatio,
} from "./money-utils.ts";
export {
  isTaxIntelligenceEnabled,
  isTaxExternalIntegrationsEnabled,
  isTaxExternalAiEnabled,
  getTaxFeatureFlags,
} from "./tax-feature-flags.ts";
export {
  assertRuleActive,
  resolveActiveRuleVersion,
  requireParameter,
  requireNumberParameter,
  listRequiredKeysHint,
  validateRuleVersionShape,
} from "./tax-rule-registry.ts";
export {
  createTaxEngine,
  createTaxProviderRegistry,
  defaultTaxEngine,
  type TaxEngine,
} from "./tax-engine.ts";
export {
  buildExecutiveTaxDashboard,
  buildTaxDrillDown,
  computeAssessments,
} from "./tax-dashboard-service.ts";
export { simulateTaxScenario } from "./tax-simulator-service.ts";
export {
  rankTaxSuppliers,
  DEFAULT_SUPPLIER_WEIGHTS,
} from "./tax-supplier-ranking-service.ts";
export { projectTaxCashflow } from "./tax-cashflow-service.ts";
export { buildTaxAlerts } from "./tax-alerts-service.ts";
export {
  buildTaxEnterpriseReport,
  prepareTaxReportExport,
} from "./tax-reports-service.ts";
export {
  buildTaxAiRecommendations,
  deterministicTaxAiProvider,
  externalTaxAiStubProvider,
  type TaxAiProvider,
  type TaxAiContext,
} from "./tax-ai-service.ts";
export {
  TAX_INTEGRATION_CONNECTORS,
  listTaxIntegrationConnectors,
  describeTaxIntegrationArchitecture,
} from "./tax-integration-architecture.ts";
export {
  buildTaxIntelligenceBundle,
  taxIntelligenceDrillDown,
  taxIntelligenceSimulate,
} from "./tax-intelligence-service.ts";
export {
  TAX_REFORM_2027_EFFECTIVE_FROM,
  buildUniversalTaxReform2027Templates,
  describeRegimeSpecificNote2027,
  type TaxReform2027Template,
} from "./tax-reform-2027.ts";
