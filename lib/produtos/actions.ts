"use server";

import { revalidatePath } from "next/cache";

import { normalizeProdutoFormValues } from "@/lib/produtos/mappers";
import { createProdutoService } from "@/lib/produtos/produto-service";
import { produtoFormSchema } from "@/lib/produtos/validations";
import { toActionError } from "@/lib/supabase/friendly-error";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

function revalidateProdutoPaths(tenantSlug: string, produtoId?: string) {
  revalidatePath(`/${tenantSlug}/produtos`);

  if (produtoId) {
    revalidatePath(`/${tenantSlug}/produtos/${produtoId}`);
    revalidatePath(`/${tenantSlug}/produtos/${produtoId}/editar`);
  }
}

export async function createProdutoAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = produtoFormSchema.parse(values);
    const service = await createProdutoService(tenant.id);
    const produto = await service.create(normalizeProdutoFormValues(parsed));

    revalidateProdutoPaths(tenantSlug, produto.id);
    return { success: true, id: produto.id };
  } catch (error) {
    return toActionError(error, "Erro ao cadastrar item.", "produtos.create");
  }
}

export async function updateProdutoAction(
  tenantSlug: string,
  produtoId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = produtoFormSchema.parse(values);
    const service = await createProdutoService(tenant.id);
    await service.update(produtoId, normalizeProdutoFormValues(parsed));

    revalidateProdutoPaths(tenantSlug, produtoId);
    return { success: true, id: produtoId };
  } catch (error) {
    return toActionError(error, "Erro ao atualizar item.", "produtos.update");
  }
}

export async function deleteProdutoAction(
  tenantSlug: string,
  produtoId: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createProdutoService(tenant.id);
    await service.softDelete(produtoId);

    revalidateProdutoPaths(tenantSlug);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Erro ao excluir item.", "produtos.delete");
  }
}
