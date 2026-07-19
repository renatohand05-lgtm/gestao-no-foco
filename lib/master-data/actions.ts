"use server";

import { revalidatePath } from "next/cache";

import { createFornecedorService } from "@/lib/financeiro/fornecedor-service";
import { masterCacheInvalidate, MASTER_CACHE_BUCKETS } from "@/lib/master-data";
import { createMasterDataService } from "@/lib/master-data";
import { toActionError } from "@/lib/supabase/friendly-error";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";
import type { FornecedorInput } from "@/types/fornecedores";
import type { ContaPagarAutofillSuggestion, MasterSearchHit } from "@/lib/master-data";

function revalidateFornecedor(tenantSlug: string, id?: string) {
  revalidatePath(`/${tenantSlug}/financeiro/fornecedores`);
  revalidatePath(`/${tenantSlug}/financeiro/contas-pagar`);
  revalidatePath(`/${tenantSlug}/busca`);
  if (id) revalidatePath(`/${tenantSlug}/financeiro/fornecedores/${id}`);
}

export async function createFornecedorAction(
  tenantSlug: string,
  values: FornecedorInput,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createFornecedorService(tenant.id);
    const item = await service.create(values);
    masterCacheInvalidate(tenant.id, MASTER_CACHE_BUCKETS.fornecedores);
    revalidateFornecedor(tenantSlug, item.id);
    return { success: true, id: item.id };
  } catch (error) {
    return toActionError(error, "Erro ao criar fornecedor.", "fornecedores.create");
  }
}

export async function updateFornecedorAction(
  tenantSlug: string,
  id: string,
  values: FornecedorInput,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createFornecedorService(tenant.id);
    await service.update(id, values);
    masterCacheInvalidate(tenant.id, MASTER_CACHE_BUCKETS.fornecedores);
    revalidateFornecedor(tenantSlug, id);
    return { success: true, id };
  } catch (error) {
    return toActionError(error, "Erro ao atualizar fornecedor.", "fornecedores.update");
  }
}

export async function deleteFornecedorAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createFornecedorService(tenant.id);
    await service.softDelete(id);
    masterCacheInvalidate(tenant.id, MASTER_CACHE_BUCKETS.fornecedores);
    revalidateFornecedor(tenantSlug);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Erro ao excluir fornecedor.", "fornecedores.delete");
  }
}

export async function checkFornecedorDuplicatesAction(
  tenantSlug: string,
  input: {
    excludeId?: string;
    documento?: string | null;
    nome?: string | null;
    nomeFantasia?: string | null;
    email?: string | null;
  },
) {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createFornecedorService(tenant.id);
    return { success: true as const, result: await service.checkDuplicates(input) };
  } catch (error) {
    return {
      ...toActionError(error, "Erro ao verificar duplicidades.", "fornecedores.checkDuplicates"),
      success: false as const,
    };
  }
}

export async function getFornecedorAutofillAction(
  tenantSlug: string,
  fornecedorId: string,
): Promise<
  | { success: true; suggestion: ContaPagarAutofillSuggestion | null }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const md = await createMasterDataService(tenant.id, tenantSlug);
    const suggestion = await md.getFornecedorAutofill(fornecedorId);
    return { success: true, suggestion };
  } catch (error) {
    return toActionError(
      error,
      "Erro ao carregar sugestão do fornecedor.",
      "fornecedores.autofill",
    );
  }
}

export async function masterDataSearchAction(
  tenantSlug: string,
  query: string,
): Promise<
  { success: true; hits: MasterSearchHit[] } | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const md = await createMasterDataService(tenant.id, tenantSlug);
    const hits = await md.search(query);
    return { success: true, hits };
  } catch (error) {
    return toActionError(error, "Erro na busca.", "masterData.search");
  }
}
