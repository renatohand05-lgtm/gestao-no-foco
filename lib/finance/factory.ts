/**
 * Sprint 22.1 — Factory do Finance Core (memory + supabase).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.ts";
import type {
  ApprovalRepository,
  AuditRepository,
  NotificationRepository,
  WorkflowRepository,
} from "../enterprise/repositories/contracts.ts";
import type { OutboxRepository } from "../enterprise/repositories/outbox-repository.ts";
import {
  createBankAccountService,
  type BankAccountService,
} from "./bank/bank-account-service.ts";
import {
  createMemoryBankAccountRepository,
  createSupabaseBankAccountRepository,
  type BankAccountRepository,
} from "./bank/bank-account-repository.ts";
import {
  createCategoryService,
  createMemoryCategoryRepository,
  createSupabaseCategoryRepository,
  type CategoryService,
} from "./categories/category-service.ts";
import {
  createCashMovementService,
  type CashMovementService,
} from "./cashflow/cash-movement-service.ts";
import {
  createMemoryCashMovementRepository,
  createSupabaseCashMovementRepository,
  type CashMovementRepository,
} from "./cashflow/cash-movement-repository.ts";
import {
  createCashFlowService,
  createFinancialSummaryService,
  type CashFlowService,
  type FinancialSummaryService,
} from "./cashflow/cashflow-service.ts";
import {
  createCostCenterService,
  createMemoryCostCenterRepository,
  createSupabaseCostCenterRepository,
  type CostCenterService,
} from "./cost-centers/cost-center-service.ts";
import {
  createFinanceEnterpriseBridge,
  type FinanceEnterpriseBridge,
} from "./shared/enterprise-bridge.ts";
import type { BankAccount, CashMovement, Category, CostCenter } from "./shared/types.ts";

export type FinanceCoreKit = {
  bridge: FinanceEnterpriseBridge;
  bankAccounts: BankAccountService;
  movements: CashMovementService;
  cashFlow: CashFlowService;
  summary: FinancialSummaryService;
  categories: CategoryService;
  costCenters: CostCenterService;
  repos: {
    bankAccounts: BankAccountRepository;
    movements: CashMovementRepository;
  };
};

export type FinanceCoreEnterpriseDeps = {
  audit: Pick<AuditRepository, "append">;
  outbox: OutboxRepository;
  notification?: Pick<NotificationRepository, "create" | "saveRecipients">;
  workflow?: Pick<WorkflowRepository, "listInstances">;
  approval?: Pick<ApprovalRepository, "listRequests">;
};

export function createMemoryFinanceCore(
  enterprise: FinanceCoreEnterpriseDeps,
  seed?: {
    accounts?: BankAccount[];
    movements?: CashMovement[];
    categories?: Category[];
    costCenters?: CostCenter[];
  },
): FinanceCoreKit {
  const balances = new Map<string, number>();
  for (const a of seed?.accounts ?? []) {
    balances.set(a.id, a.currentBalance);
  }
  const bankRepo = createMemoryBankAccountRepository(seed?.accounts ?? []);
  const moveRepo = createMemoryCashMovementRepository(
    seed?.movements ?? [],
    balances,
  );
  const catRepo = createMemoryCategoryRepository(seed?.categories ?? []);
  const ccRepo = createMemoryCostCenterRepository(seed?.costCenters ?? []);
  const bridge = createFinanceEnterpriseBridge(enterprise);

  return {
    bridge,
    bankAccounts: createBankAccountService({ repo: bankRepo, bridge }),
    movements: createCashMovementService({ repo: moveRepo, bridge }),
    cashFlow: createCashFlowService({ movements: moveRepo, accounts: bankRepo }),
    summary: createFinancialSummaryService({
      movements: moveRepo,
      accounts: bankRepo,
    }),
    categories: createCategoryService({ repo: catRepo, bridge }),
    costCenters: createCostCenterService({ repo: ccRepo, bridge }),
    repos: { bankAccounts: bankRepo, movements: moveRepo },
  };
}

export function createSupabaseFinanceCore(
  client: SupabaseClient<Database>,
  enterprise: FinanceCoreEnterpriseDeps,
): FinanceCoreKit {
  const bankRepo = createSupabaseBankAccountRepository(client);
  const moveRepo = createSupabaseCashMovementRepository(client);
  const catRepo = createSupabaseCategoryRepository(client);
  const ccRepo = createSupabaseCostCenterRepository(client);
  const bridge = createFinanceEnterpriseBridge(enterprise);

  return {
    bridge,
    bankAccounts: createBankAccountService({ repo: bankRepo, bridge }),
    movements: createCashMovementService({ repo: moveRepo, bridge }),
    cashFlow: createCashFlowService({ movements: moveRepo, accounts: bankRepo }),
    summary: createFinancialSummaryService({
      movements: moveRepo,
      accounts: bankRepo,
    }),
    categories: createCategoryService({ repo: catRepo, bridge }),
    costCenters: createCostCenterService({ repo: ccRepo, bridge }),
    repos: { bankAccounts: bankRepo, movements: moveRepo },
  };
}
