"use server";

import { revalidatePath } from "next/cache";

import { normalizeMovimentacaoFormValues } from "@/lib/estoque/mappers";
import { createEstoqueService } from "@/lib/estoque/estoque-service";
import { movimentacaoFormSchema } from "@/lib/estoque/validations";
import { getCurrentProfile } from "@/lib/auth/session";
import { requireTenant } from "@/lib/tenants";

type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

function revalidateEstoquePaths(tenantSlug: string, movimentacaoId?: string) {
  revalidatePath(`/${tenantSlug}/estoque`);
  revalidatePath(`/${tenantSlug}/produtos`);

  if (movimentacaoId) {
    revalidatePath(`/${tenantSlug}/estoque/${movimentacaoId}`);
  }
}

export async function createMovimentacaoAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = movimentacaoFormSchema.parse(values);
    const service = await createEstoqueService(tenant.id);
    const movimentacao = await service.createMovimentacao(
      normalizeMovimentacaoFormValues(parsed),
      profile?.id ?? null,
    );

    revalidateEstoquePaths(tenantSlug, movimentacao.id);
    return { success: true, id: movimentacao.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao registrar movimentação.",
    };
  }
}

export async function deleteMovimentacaoAction(
  tenantSlug: string,
  movimentacaoId: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createEstoqueService(tenant.id);
    await service.softDeleteMovimentacao(movimentacaoId);

    revalidateEstoquePaths(tenantSlug);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao excluir movimentação.",
    };
  }
}
