"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { ZodError } from "zod";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  normalizeMetaVendasFormValues,
  normalizeMetaVendasUpdateValues,
} from "@/lib/metas/mappers";
import { createMetaVendasService } from "@/lib/metas/meta-vendas-service";
import { METAS_VENDAS_CACHE_TAG } from "@/lib/metas/resolve-meta-mensal";
import {
  formatMetaVendasZodError,
  metaVendasFormSchema,
  metaVendasUpdateSchema,
} from "@/lib/metas/validations";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

function revalidateMetasPaths(tenantSlug: string, id?: string) {
  revalidatePath(`/${tenantSlug}/dashboard`);
  revalidatePath(`/${tenantSlug}/analytics`);
  revalidatePath(`/${tenantSlug}/analytics/metas`);
  revalidatePath(`/${tenantSlug}/inteligencia`);
  revalidatePath(`/${tenantSlug}/configuracoes`);
  revalidatePath(`/${tenantSlug}/configuracoes/metas`);
  if (id) {
    revalidatePath(`/${tenantSlug}/configuracoes/metas/${id}/editar`);
  }
  // Invalidação de tag + read-your-own-writes (Next 16)
  updateTag(METAS_VENDAS_CACHE_TAG);
  revalidateTag(METAS_VENDAS_CACHE_TAG, "max");
}

function toActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) return formatMetaVendasZodError(error);
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function createMetaVendasAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = metaVendasFormSchema.parse(values);
    const service = await createMetaVendasService(tenant.id);
    const item = await service.create({
      ...normalizeMetaVendasFormValues(parsed),
      created_by: profile?.id ?? null,
    });

    revalidateMetasPaths(tenantSlug, item.id);
    return { success: true, id: item.id };
  } catch (error) {
    return {
      success: false,
      error: toActionError(error, "Erro ao cadastrar meta."),
    };
  }
}

export async function updateMetaVendasAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = metaVendasUpdateSchema.parse(values);
    const service = await createMetaVendasService(tenant.id);
    await service.update(id, normalizeMetaVendasUpdateValues(parsed));

    revalidateMetasPaths(tenantSlug, id);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: toActionError(error, "Erro ao atualizar meta."),
    };
  }
}

export async function deleteMetaVendasAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createMetaVendasService(tenant.id);
    await service.softDelete(id);

    revalidateMetasPaths(tenantSlug, id);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: toActionError(error, "Erro ao excluir meta."),
    };
  }
}
