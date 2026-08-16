"use server";

import { revalidatePath } from "next/cache";

import { createProdutoService } from "@/lib/produtos/produto-service";
import { requireTenantMutationPermission } from "@/lib/rbac/mutation-auth";
import {
  libraryItemToCreateInput,
  planLibraryAdoption,
} from "@/lib/segments/library-adopt.ts";
import {
  getLibraryForContext,
  librarySegmentForContext,
} from "@/lib/segments/catalogs/index.ts";
import { resolveSegmentContext } from "@/lib/segments/resolve.ts";
import { toActionError } from "@/lib/supabase/friendly-error";

const MAX_SELECTION = 200;

export type AdoptSegmentLibraryResult =
  | {
      success: true;
      created: number;
      skippedDuplicate: number;
      skippedOther: number;
    }
  | { success: false; error: string };

export async function adoptSegmentLibraryAction(
  tenantSlug: string,
  selectedIds: unknown,
): Promise<AdoptSegmentLibraryResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(
      tenantSlug,
      "produtos.criar",
    );
    const ids = Array.isArray(selectedIds)
      ? selectedIds.filter((id): id is string => typeof id === "string").slice(0, MAX_SELECTION)
      : [];
    if (ids.length === 0) {
      return { success: false, error: "Selecione ao menos um serviço da biblioteca." };
    }

    const ctx = resolveSegmentContext({
      segment: tenant.segment,
      segmentVersion: tenant.segment_version,
      segmentConfig: tenant.segment_config,
    });
    const segment = librarySegmentForContext(ctx);
    const library = getLibraryForContext(ctx);
    if (library.length === 0) {
      return { success: false, error: "Não há sugestões para este tipo de negócio." };
    }

    const service = await createProdutoService(tenant.id);
    const existing = await service.listNamesForDedup();
    const plan = planLibraryAdoption(segment, ids, existing);
    if (plan.toCreate.length === 0) {
      return {
        success: true,
        created: 0,
        skippedDuplicate: plan.skippedDuplicate.length,
        skippedOther:
          plan.skippedUnknown.length + plan.skippedWrongSegment.length,
      };
    }

    await service.createMany(plan.toCreate.map(libraryItemToCreateInput));
    revalidatePath(`/${tenantSlug}/produtos`);
    revalidatePath(`/${tenantSlug}/produtos/catalogo-inicial`);
    return {
      success: true,
      created: plan.toCreate.length,
      skippedDuplicate: plan.skippedDuplicate.length,
      skippedOther:
        plan.skippedUnknown.length + plan.skippedWrongSegment.length,
    };
  } catch (error) {
    const mapped = toActionError(
      error,
      "Erro ao adicionar serviços selecionados.",
      "produtos.library.adopt",
    );
    return { success: false, error: mapped.error };
  }
}
