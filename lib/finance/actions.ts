"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createAuditSupabaseAdapter,
  createApprovalSupabaseAdapter,
  createIdempotencySupabaseAdapter,
  createNotificationSupabaseAdapter,
  createOutboxSupabaseAdapter,
  createRbacSupabaseAdapter,
  createWorkflowSupabaseAdapter,
  createEnterpriseContext,
  createMemoryIdempotencyRepository,
  MemoryEnterpriseStore,
} from "@/lib/enterprise";
import {
  FinanceError,
  FINANCE_ERROR_CODES,
  createSupabaseFinanceCore,
  resolveFinanceEffectivePermissions,
  assertFinanceAccess,
  type CreateBankAccountInput,
  type CreateCategoryInput,
  type CreateCostCenterInput,
  type CreateMovementInput,
  type TreasuryMovementFilters,
  type TreasuryPeriodKey,
  type UpdateBankAccountInput,
  type UpdateMovementInput,
} from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

async function resolveIdempotency() {
  try {
    const { isAdminClientAvailable, createAdminClient } = await import(
      "@/lib/supabase/admin"
    );
    if (isAdminClientAvailable()) {
      return createIdempotencySupabaseAdapter(createAdminClient());
    }
  } catch {
    /* fall through */
  }
  return createMemoryIdempotencyRepository(new MemoryEnterpriseStore());
}

async function resolveFinance(tenantSlug: string) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new FinanceError(
      "Sessão ausente.",
      FINANCE_ERROR_CODES.PERMISSION_DENIED,
    );
  }

  const client = await createClient();
  const audit = createAuditSupabaseAdapter(client);
  const outbox = createOutboxSupabaseAdapter(client);
  const notification = createNotificationSupabaseAdapter(client);
  const workflow = createWorkflowSupabaseAdapter(client);
  const approval = createApprovalSupabaseAdapter(client);
  const rbac = createRbacSupabaseAdapter(client);
  const idempotency = await resolveIdempotency();

  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const effective = resolveFinanceEffectivePermissions({
    membershipRole: tenant.role,
    snapshotRoles: snap.roles,
    snapshotPermissions: snap.permissions,
  });

  assertFinanceAccess(effective.permissions);

  const context = createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    roles: effective.roles,
    permissions: effective.permissions,
    source: "server_action",
    metadata: {
      financeAuthSource: effective.source,
      membershipRole: tenant.role,
    },
  });

  const kit = createSupabaseFinanceCore(client, {
    audit,
    outbox,
    notification,
    workflow,
    approval,
    idempotency,
    tenantSlug,
  });

  return { tenant, context, kit, tenantSlug };
}

function toError(error: unknown): { success: false; error: string; code?: string } {
  return {
    success: false,
    error:
      error instanceof FinanceError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro financeiro.",
    code: error instanceof FinanceError ? error.code : undefined,
  };
}

function revalidateFinance(tenantSlug: string) {
  revalidatePath(`/${tenantSlug}/financeiro`);
  revalidatePath(`/${tenantSlug}/financeiro/contas`);
  revalidatePath(`/${tenantSlug}/financeiro/movimentacoes`);
  revalidatePath(`/${tenantSlug}/financeiro/transferencias`);
  revalidatePath(`/${tenantSlug}/financeiro/categorias`);
  revalidatePath(`/${tenantSlug}/financeiro/centros-custo`);
  revalidatePath(`/${tenantSlug}/financeiro/importar`);
}

export async function createBankAccount(
  tenantSlug: string,
  input: CreateBankAccountInput,
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const account = await kit.bankAccounts.create(context, input);
    revalidateFinance(tenantSlug);
    return { success: true as const, account };
  } catch (error) {
    return toError(error);
  }
}

export async function updateBankAccount(
  tenantSlug: string,
  id: string,
  input: UpdateBankAccountInput,
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const account = await kit.bankAccounts.update(context, id, input);
    revalidateFinance(tenantSlug);
    return { success: true as const, account };
  } catch (error) {
    return toError(error);
  }
}

export async function archiveBankAccount(tenantSlug: string, id: string) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const account = await kit.bankAccounts.archive(context, id);
    revalidateFinance(tenantSlug);
    return { success: true as const, account };
  } catch (error) {
    return toError(error);
  }
}

export async function createMovement(
  tenantSlug: string,
  input: CreateMovementInput,
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const movement = await kit.movements.create(context, input);
    revalidateFinance(tenantSlug);
    return { success: true as const, movement };
  } catch (error) {
    return toError(error);
  }
}

export async function updateMovement(
  tenantSlug: string,
  id: string,
  input: UpdateMovementInput,
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const movement = await kit.movements.update(context, id, input);
    revalidateFinance(tenantSlug);
    return { success: true as const, movement };
  } catch (error) {
    return toError(error);
  }
}

export async function deleteMovement(tenantSlug: string, id: string) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const movement = await kit.movements.delete(context, id);
    revalidateFinance(tenantSlug);
    return { success: true as const, movement };
  } catch (error) {
    return toError(error);
  }
}

export async function transferBetweenAccounts(
  tenantSlug: string,
  input: {
    fromAccountId?: string;
    bankAccountId?: string;
    toAccountId: string;
    amount: number;
    movementDate: string;
    description: string;
    categoryId?: string | null;
    costCenterId?: string | null;
    notes?: string | null;
    currency?: "BRL";
    idempotencyKey?: string;
  },
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const fromAccountId = input.fromAccountId ?? input.bankAccountId;
    if (!fromAccountId) {
      throw new FinanceError(
        "Conta de origem obrigatória.",
        FINANCE_ERROR_CODES.VALIDATION,
      );
    }
    const transfer = await kit.treasury.transferBetweenAccounts(context, {
      fromAccountId,
      toAccountId: input.toAccountId,
      amount: input.amount,
      movementDate: input.movementDate,
      description: input.description,
      categoryId: input.categoryId,
      costCenterId: input.costCenterId,
      notes: input.notes,
      currency: input.currency ?? "BRL",
      idempotencyKey:
        input.idempotencyKey?.trim() ||
        `xfer_${context.correlationId}_${fromAccountId}_${input.toAccountId}_${input.amount}`,
    });
    revalidateFinance(tenantSlug);
    return { success: true as const, transfer, movement: transfer.outMovement };
  } catch (error) {
    return toError(error);
  }
}

export async function listCashFlow(
  tenantSlug: string,
  opts: { from?: string; to?: string; accountId?: string } = {},
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const cashFlow = await kit.cashFlow.listCashFlow(context, opts);
    return { success: true as const, cashFlow };
  } catch (error) {
    return toError(error);
  }
}

export async function getFinancialSummary(tenantSlug: string) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const summary = await kit.summary.getFinancialSummary(context);
    return { success: true as const, summary };
  } catch (error) {
    return toError(error);
  }
}

export async function getTreasurySummary(
  tenantSlug: string,
  periodKey: TreasuryPeriodKey = "30d",
  custom?: { from?: string; to?: string },
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const summary = await kit.treasury.getTreasurySummary(
      context,
      periodKey,
      custom,
    );
    return { success: true as const, summary };
  } catch (error) {
    return toError(error);
  }
}

export async function getTreasuryAccounts(tenantSlug: string) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const accounts = await kit.treasury.getTreasuryAccounts(context);
    return { success: true as const, accounts };
  } catch (error) {
    return toError(error);
  }
}

export async function getTreasuryBalanceEvolution(
  tenantSlug: string,
  periodKey: TreasuryPeriodKey = "30d",
  accountId?: string | null,
  custom?: { from?: string; to?: string },
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const evolution = await kit.treasury.getTreasuryBalanceEvolution(
      context,
      periodKey,
      accountId,
      custom,
    );
    return { success: true as const, evolution };
  } catch (error) {
    return toError(error);
  }
}

export async function listTreasuryMovements(
  tenantSlug: string,
  filters: TreasuryMovementFilters = {},
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const page = await kit.treasury.listTreasuryMovements(context, filters);
    return { success: true as const, page };
  } catch (error) {
    return toError(error);
  }
}

export async function getTreasuryInsights(
  tenantSlug: string,
  periodKey: TreasuryPeriodKey = "30d",
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const insights = await kit.treasury.getTreasuryInsights(context, periodKey);
    return { success: true as const, insights };
  } catch (error) {
    return toError(error);
  }
}

export async function getTreasuryAlerts(
  tenantSlug: string,
  periodKey: TreasuryPeriodKey = "30d",
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const alerts = await kit.treasury.getTreasuryAlerts(context, periodKey);
    return { success: true as const, alerts };
  } catch (error) {
    return toError(error);
  }
}

export async function listBankAccounts(tenantSlug: string) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const accounts = await kit.bankAccounts.list(context);
    return { success: true as const, accounts };
  } catch (error) {
    return toError(error);
  }
}

export async function listMovements(
  tenantSlug: string,
  opts?: { from?: string; to?: string; accountId?: string },
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const movements = await kit.movements.list(context, opts);
    return { success: true as const, movements };
  } catch (error) {
    return toError(error);
  }
}

export async function createCategory(
  tenantSlug: string,
  input: CreateCategoryInput,
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const category = await kit.categories.create(context, input);
    revalidateFinance(tenantSlug);
    return { success: true as const, category };
  } catch (error) {
    return toError(error);
  }
}

export async function listCategories(tenantSlug: string) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const categories = await kit.categories.list(context);
    return { success: true as const, categories };
  } catch (error) {
    return toError(error);
  }
}

export async function createCostCenter(
  tenantSlug: string,
  input: CreateCostCenterInput,
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const costCenter = await kit.costCenters.create(context, input);
    revalidateFinance(tenantSlug);
    return { success: true as const, costCenter };
  } catch (error) {
    return toError(error);
  }
}

export async function listCostCenters(tenantSlug: string) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const costCenters = await kit.costCenters.list(context);
    return { success: true as const, costCenters };
  } catch (error) {
    return toError(error);
  }
}

export async function archiveCostCenter(tenantSlug: string, id: string) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const costCenter = await kit.costCenters.archive(context, id);
    revalidateFinance(tenantSlug);
    return { success: true as const, costCenter };
  } catch (error) {
    return toError(error);
  }
}
