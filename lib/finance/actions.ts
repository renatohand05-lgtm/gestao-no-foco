"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createAuditSupabaseAdapter,
  createApprovalSupabaseAdapter,
  createNotificationSupabaseAdapter,
  createOutboxSupabaseAdapter,
  createRbacSupabaseAdapter,
  createWorkflowSupabaseAdapter,
  createEnterpriseContext,
} from "@/lib/enterprise";
import {
  FinanceError,
  FINANCE_ERROR_CODES,
  createSupabaseFinanceCore,
  type CreateBankAccountInput,
  type CreateCategoryInput,
  type CreateCostCenterInput,
  type CreateMovementInput,
  type UpdateBankAccountInput,
  type UpdateMovementInput,
} from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

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

  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const permissions = snap.permissions.length
    ? snap.permissions
    : [
        "financeiro.visualizar",
        "financeiro.criar",
        "financeiro.editar",
        "financeiro.excluir",
        "financeiro.arquivar",
        "financeiro.transferir",
        "financeiro.ver_saldos",
        "financeiro.ver_fluxo_caixa",
      ];

  const context = createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    roles: snap.roles,
    permissions,
    source: "server_action",
  });

  const kit = createSupabaseFinanceCore(client, {
    audit,
    outbox,
    notification,
    workflow,
    approval,
  });

  return { tenant, context, kit, tenantSlug };
}

function toError(error: unknown): { success: false; error: string } {
  return {
    success: false,
    error:
      error instanceof FinanceError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro financeiro.",
  };
}

function revalidateFinance(tenantSlug: string) {
  revalidatePath(`/${tenantSlug}/financeiro`);
  revalidatePath(`/${tenantSlug}/financeiro/contas`);
  revalidatePath(`/${tenantSlug}/financeiro/movimentacoes`);
  revalidatePath(`/${tenantSlug}/financeiro/categorias`);
  revalidatePath(`/${tenantSlug}/financeiro/centros-custo`);
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
    bankAccountId: string;
    toAccountId: string;
    amount: number;
    movementDate: string;
    description: string;
    categoryId?: string | null;
    costCenterId?: string | null;
    notes?: string | null;
  },
) {
  try {
    const { context, kit } = await resolveFinance(tenantSlug);
    const movement = await kit.movements.transfer(context, input);
    revalidateFinance(tenantSlug);
    return { success: true as const, movement };
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
