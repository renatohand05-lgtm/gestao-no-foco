"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createFinanceBudgetService,
  type FinanceBudgetStatus,
} from "@/lib/finance/budget/budget-service";
import {
  financeBudgetFormSchema,
  financeBudgetStatusSchema,
} from "@/lib/finance/budget/validations";
import {
  assertFinancePermission,
  resolveFinanceEffectivePermissions,
} from "@/lib/finance/shared/rbac";
import { createRbacSupabaseAdapter } from "@/lib/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

function revalidateBudget(tenantSlug: string, id?: string) {
  revalidatePath(`/${tenantSlug}/financeiro/orcamento`);
  revalidatePath(`/${tenantSlug}/financeiro/cfo`);
  if (id) revalidatePath(`/${tenantSlug}/financeiro/orcamento/${id}`);
}

async function requireBudgetPerm(
  tenantSlug: string,
  needed: "criar" | "editar" | "aprovar" | "visualizar",
) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) throw new Error("Sessão ausente.");
  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const effective = resolveFinanceEffectivePermissions({
    membershipRole: tenant.role,
    snapshotRoles: snap.roles,
    snapshotPermissions: snap.permissions,
  });
  const key =
    needed === "criar"
      ? (["financeiro.orcamento.criar"] as const)
      : needed === "editar"
        ? (["financeiro.orcamento.editar"] as const)
        : needed === "aprovar"
          ? (["financeiro.orcamento.aprovar"] as const)
          : (["financeiro.orcamento.visualizar"] as const);
  assertFinancePermission(effective.permissions, [...key]);
  return { tenant, profile };
}

export async function createFinanceBudgetAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const { tenant, profile } = await requireBudgetPerm(tenantSlug, "criar");
    const parsed = financeBudgetFormSchema.parse(values);
    const svc = await createFinanceBudgetService(tenant.id);
    const row = await svc.create(
      {
        nome: parsed.nome,
        ano: parsed.ano,
        observacao: parsed.observacao,
        filial_id: parsed.filial_id,
        empresa_id: parsed.empresa_id,
      },
      profile.id,
      parsed.lines,
    );
    revalidateBudget(tenantSlug, row.id);
    return { success: true, id: row.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao criar orçamento.",
    };
  }
}

export async function updateFinanceBudgetAction(
  tenantSlug: string,
  budgetId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireBudgetPerm(tenantSlug, "editar");
    const parsed = financeBudgetFormSchema.parse(values);
    const svc = await createFinanceBudgetService(tenant.id);
    await svc.update(
      budgetId,
      {
        nome: parsed.nome,
        ano: parsed.ano,
        observacao: parsed.observacao,
        filial_id: parsed.filial_id,
        empresa_id: parsed.empresa_id,
      },
      parsed.lines,
    );
    revalidateBudget(tenantSlug, budgetId);
    return { success: true, id: budgetId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao atualizar orçamento.",
    };
  }
}

export async function duplicateFinanceBudgetAction(
  tenantSlug: string,
  budgetId: string,
): Promise<ActionResult> {
  try {
    const { tenant, profile } = await requireBudgetPerm(tenantSlug, "criar");
    const svc = await createFinanceBudgetService(tenant.id);
    const row = await svc.duplicate(budgetId, profile.id);
    revalidateBudget(tenantSlug, row.id);
    return { success: true, id: row.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao duplicar orçamento.",
    };
  }
}

export async function setFinanceBudgetStatusAction(
  tenantSlug: string,
  budgetId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const parsed = financeBudgetStatusSchema.parse(status);
    const needsApprove = parsed === "aprovado" || parsed === "reprovado";
    const { tenant, profile } = await requireBudgetPerm(
      tenantSlug,
      needsApprove ? "aprovar" : "editar",
    );
    const svc = await createFinanceBudgetService(tenant.id);
    await svc.setStatus(budgetId, parsed as FinanceBudgetStatus, profile.id);
    revalidateBudget(tenantSlug, budgetId);
    return { success: true, id: budgetId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao alterar status.",
    };
  }
}

export async function deleteFinanceBudgetAction(
  tenantSlug: string,
  budgetId: string,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireBudgetPerm(tenantSlug, "editar");
    const svc = await createFinanceBudgetService(tenant.id);
    await svc.softDelete(budgetId);
    revalidateBudget(tenantSlug);
    return { success: true, id: budgetId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao excluir orçamento.",
    };
  }
}

export async function exportFinanceBudgetAction(
  tenantSlug: string,
  budgetId: string,
): Promise<
  | { success: true; payload: unknown }
  | { success: false; error: string }
> {
  try {
    const { tenant } = await requireBudgetPerm(tenantSlug, "visualizar");
    const svc = await createFinanceBudgetService(tenant.id);
    const payload = await svc.exportPayload(budgetId);
    return { success: true, payload };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao exportar orçamento.",
    };
  }
}
