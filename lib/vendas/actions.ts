"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { normalizeVendaFormValues } from "@/lib/vendas/mappers";
import { createVendaService } from "@/lib/vendas/venda-service";
import {
  faturarEReceberVendaFormSchema,
  vendaFormSchema,
} from "@/lib/vendas/validations";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

function revalidateVendaPaths(tenantSlug: string, vendaId?: string) {
  revalidatePath(`/${tenantSlug}/vendas`);
  revalidatePath(`/${tenantSlug}/estoque`);
  revalidatePath(`/${tenantSlug}/produtos`);
  revalidatePath(`/${tenantSlug}/financeiro/contas-receber`);
  revalidatePath(`/${tenantSlug}/financeiro/dre`);

  if (vendaId) {
    revalidatePath(`/${tenantSlug}/vendas/${vendaId}`);
    revalidatePath(`/${tenantSlug}/vendas/${vendaId}/editar`);
  }
}

export async function createVendaAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = vendaFormSchema.parse(values);
    const service = await createVendaService(tenant.id);
    const venda = await service.create(
      normalizeVendaFormValues(parsed),
      profile?.id ?? null,
    );

    revalidateVendaPaths(tenantSlug, venda.id);
    return { success: true, id: venda.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao registrar venda.",
    };
  }
}

export async function updateVendaAction(
  tenantSlug: string,
  vendaId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = vendaFormSchema.parse(values);
    const service = await createVendaService(tenant.id);
    await service.update(vendaId, normalizeVendaFormValues(parsed));

    revalidateVendaPaths(tenantSlug, vendaId);
    return { success: true, id: vendaId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar venda.",
    };
  }
}

export async function deleteVendaAction(
  tenantSlug: string,
  vendaId: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createVendaService(tenant.id);
    await service.softDelete(vendaId);

    revalidateVendaPaths(tenantSlug);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir venda.",
    };
  }
}

export async function faturarVendaAction(
  tenantSlug: string,
  vendaId: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const service = await createVendaService(tenant.id);
    await service.faturar(vendaId, profile?.id ?? null);

    revalidateVendaPaths(tenantSlug, vendaId);
    return { success: true, id: vendaId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao faturar venda.",
    };
  }
}

export async function faturarEReceberVendaAction(
  tenantSlug: string,
  vendaId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = faturarEReceberVendaFormSchema.parse(values);
    const service = await createVendaService(tenant.id);
    await service.faturarEReceber(
      vendaId,
      parsed.conta_bancaria_id,
      profile?.id ?? null,
      parsed.data_recebimento,
    );

    revalidateVendaPaths(tenantSlug, vendaId);
    revalidatePath(`/${tenantSlug}/financeiro`);
    revalidatePath(`/${tenantSlug}/financeiro/contas-receber`);
    revalidatePath(`/${tenantSlug}/financeiro/contas-bancarias`);
    revalidatePath(
      `/${tenantSlug}/financeiro/contas-bancarias/${parsed.conta_bancaria_id}`,
    );
    revalidatePath(`/${tenantSlug}/financeiro/fluxo-caixa`);
    revalidatePath(`/${tenantSlug}/financeiro/dre`);
    return { success: true, id: vendaId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao faturar e receber venda.",
    };
  }
}

export async function cancelarVendaAction(
  tenantSlug: string,
  vendaId: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const service = await createVendaService(tenant.id);
    await service.cancelar(vendaId, profile?.id ?? null);

    revalidateVendaPaths(tenantSlug, vendaId);
    return { success: true, id: vendaId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao cancelar venda.",
    };
  }
}
