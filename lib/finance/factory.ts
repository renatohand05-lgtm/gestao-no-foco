/**
 * Sprint 22.1 / 22.2 — Factory do Finance Core + Treasury (memory + supabase).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.ts";
import type {
  ApprovalRepository,
  AuditRepository,
  IdempotencyRepository,
  NotificationRepository,
  WorkflowRepository,
} from "../enterprise/repositories/contracts.ts";
import { createMemoryIdempotencyRepository } from "../enterprise/repositories/idempotency-repository.ts";
import { MemoryEnterpriseStore } from "../enterprise/repositories/memory.ts";
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
import {
  createTreasuryService,
  type TreasuryService,
} from "./treasury/treasury-service.ts";

export type FinanceCoreKit = {
  bridge: FinanceEnterpriseBridge;
  bankAccounts: BankAccountService;
  movements: CashMovementService;
  cashFlow: CashFlowService;
  summary: FinancialSummaryService;
  categories: CategoryService;
  costCenters: CostCenterService;
  treasury: TreasuryService;
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
  idempotency?: IdempotencyRepository;
  tenantSlug?: string;
  lowBalanceThreshold?: number;
};

function buildTreasury(
  bankRepo: BankAccountRepository,
  moveRepo: CashMovementRepository,
  bridge: FinanceEnterpriseBridge,
  enterprise: FinanceCoreEnterpriseDeps,
): TreasuryService {
  return createTreasuryService({
    accounts: bankRepo,
    movements: moveRepo,
    bridge,
    idempotency:
      enterprise.idempotency ??
      createMemoryIdempotencyRepository(new MemoryEnterpriseStore()),
    tenantSlug: enterprise.tenantSlug,
    lowBalanceThreshold: enterprise.lowBalanceThreshold,
  });
}

export function createMemoryFinanceCore(
  enterprise: FinanceCoreEnterpriseDeps,
  seed?: {
    accounts?: BankAccount[];
    movements?: CashMovement[];
    categories?: Category[];
    costCenters?: CostCenter[];
  },
): FinanceCoreKit {
  const accountsSeed = seed?.accounts ?? [];
  const balances = new Map<string, number>();
  for (const a of accountsSeed) {
    balances.set(a.id, a.currentBalance);
  }
  const bankRepo = createMemoryBankAccountRepository(accountsSeed);
  const moveRepo = createMemoryCashMovementRepository(
    seed?.movements ?? [],
    balances,
    accountsSeed,
  );
  const catRepo = createMemoryCategoryRepository(seed?.categories ?? []);
  const ccRepo = createMemoryCostCenterRepository(seed?.costCenters ?? []);
  const bridge = createFinanceEnterpriseBridge(enterprise);
  const treasury = buildTreasury(bankRepo, moveRepo, bridge, enterprise);

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
    treasury,
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
  const treasury = buildTreasury(bankRepo, moveRepo, bridge, enterprise);

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
    treasury,
    repos: { bankAccounts: bankRepo, movements: moveRepo },
  };
}
