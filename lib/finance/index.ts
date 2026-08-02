/**
 * Sprint 22.1 — Enterprise Financial Core · API pública.
 */

export type * from "./shared/types.ts";
export {
  FINANCE_ERROR_CODES,
  FinanceError,
  isFinanceError,
  type FinanceErrorCode,
} from "./shared/errors.ts";
export {
  assertFinancePermission,
  assertArchivePermission,
  requireFinancePermission,
} from "./shared/rbac.ts";
export {
  resolveFinanceEffectivePermissions,
  expandFinancePermissions,
  mapMembershipRoleToEnterpriseRoles,
  assertFinanceAccess,
  financePermissionSatisfied,
  hasFinancePermissionKey,
  MEMBERSHIP_TO_ENTERPRISE_ROLES,
} from "./shared/rbac-compat.ts";
export { isFinanceLegacyMenuEnabled } from "./finance-feature-flags.ts";
export {
  createFinanceEnterpriseBridge,
  type FinanceEnterpriseBridge,
} from "./shared/enterprise-bridge.ts";
export {
  createMemoryFinanceCore,
  createSupabaseFinanceCore,
  type FinanceCoreKit,
} from "./factory.ts";
export {
  createBankAccountService,
  type BankAccountService,
} from "./bank/bank-account-service.ts";
export {
  createCashMovementService,
  type CashMovementService,
} from "./cashflow/cash-movement-service.ts";
export {
  createCashFlowService,
  createFinancialSummaryService,
  type CashFlowService,
  type FinancialSummaryService,
} from "./cashflow/cashflow-service.ts";
export {
  createCategoryService,
  type CategoryService,
} from "./categories/category-service.ts";
export {
  createCostCenterService,
  type CostCenterService,
} from "./cost-centers/cost-center-service.ts";
export {
  createTreasuryService,
  createTreasuryInsightsService,
  createTreasuryAlertsService,
  createTreasuryQueryService,
  createTreasurySummaryService,
  createTreasuryTransferService,
  resolveTreasuryPeriod,
  previousPeriodOf,
  assertTransferInput,
  moneyBRL,
  deltaTone,
  pctChange,
  TREASURY_ERROR_CODES,
  TreasuryError,
  type TreasuryService,
  type TreasuryServiceDeps,
} from "./treasury/index.ts";
export type * from "./treasury/treasury-types.ts";
export type * from "./cash-intelligence/types.ts";
export {
  computeConsolidatedBalance,
  transferConsolidatedNetImpact,
  buildCashLayers,
  projectCashflow,
  computeWorkingCapital,
  buildCashRiskAlerts,
  simulateScenario,
  buildRescheduleRecommendations,
  confirmRecommendation,
  buildDrillDown,
  buildExecutiveCashDashboard,
  cashIntelligenceDrillDown,
  cashIntelligenceRecommendations,
  cashIntelligenceSimulate,
} from "./cash-intelligence/index.ts";
export {
  matchStatementLines,
  decideMatch,
  createReconciliationService,
  createMemoryReconciliationStore,
  createReconciliationBackend,
  createProductionReconciliationService,
  createTestReconciliationService,
  createSupabaseReconciliationRepository,
  persistStatementLinesFromFinanceImport,
} from "./reconciliation/index.ts";
export type * from "./reconciliation/reconciliation-types.ts";
export type * from "./reconciliation/reconciliation-repository.ts";
export type * from "./tax-intelligence/types.ts";
export {
  buildExecutiveTaxDashboard,
  buildTaxIntelligenceBundle,
  createTaxEngine,
  computeAssessments,
  simulateTaxScenario,
  rankTaxSuppliers,
  projectTaxCashflow,
  buildTaxAlerts,
  buildTaxAiRecommendations,
  buildTaxEnterpriseReport,
  describeTaxIntegrationArchitecture,
  isTaxIntelligenceEnabled,
  getTaxFeatureFlags,
} from "./tax-intelligence/index.ts";
