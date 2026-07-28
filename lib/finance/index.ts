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
export { assertFinancePermission, assertArchivePermission } from "./shared/rbac.ts";
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
