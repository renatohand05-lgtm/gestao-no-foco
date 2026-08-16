"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createProdutoService } from "@/lib/produtos/produto-service";
import { requireTenantMutationPermission } from "@/lib/rbac/mutation-auth";
import { namesAreEquivalent } from "@/lib/segments/catalogs/builder.ts";
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
import type { ActionResultWith } from "@/types/action-result";

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

    await service.createMany(plan.toCreate.map((item) => libraryItemToCreateInput(item)));
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

function revalidateCatalogAndAgenda(tenantSlug: string) {
  revalidatePath(`/${tenantSlug}/produtos`);
  revalidatePath(`/${tenantSlug}/produtos/catalogo-inicial`);
  revalidatePath(`/${tenantSlug}/produtos/novo`);
}

const adoptOneSchema = z.object({
  libraryItemId: z.string().trim().min(1).max(160),
  preco_venda: z.number().min(0).nullable().optional(),
  tempo_estimado_minutos: z.number().int().min(0).max(24 * 60).nullable().optional(),
});

const customServiceSchema = z.object({
  nome: z.string().trim().min(2).max(200),
  preco_venda: z.number().min(0).nullable().optional(),
  tempo_estimado_minutos: z.number().int().min(0).max(24 * 60).nullable().optional(),
});

export type AdoptedServiceResult = ActionResultWith<{
  nome: string;
  minutes: number | null;
  reused: boolean;
}>;

export async function adoptOneLibraryItemAction(
  tenantSlug: string,
  values: unknown,
): Promise<AdoptedServiceResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(
      tenantSlug,
      "produtos.criar",
    );
    const parsed = adoptOneSchema.parse(values);
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
    const plan = planLibraryAdoption(segment, [parsed.libraryItemId], existing);
    if (plan.skippedWrongSegment.length > 0) {
      return { success: false, error: "Sugestão inválida para este segmento." };
    }
    if (plan.skippedUnknown.length > 0) {
      return { success: false, error: "Sugestão não encontrada na biblioteca oficial." };
    }

    const template =
      plan.toCreate[0] ??
      plan.skippedDuplicate[0] ??
      library.find((item) => item.id === parsed.libraryItemId);
    if (!template) {
      return { success: false, error: "Sugestão não encontrada na biblioteca oficial." };
    }

    const reused = existing.find((row) => namesAreEquivalent(row.nome, template.name));
    if (reused) {
      const row = await service.getById(reused.id);
      revalidateCatalogAndAgenda(tenantSlug);
      return {
        success: true,
        id: reused.id,
        nome: row?.nome ?? template.name,
        minutes: row?.tempo_estimado_minutos ?? template.defaultDurationMinutes ?? null,
        reused: true,
      };
    }

    const created = await service.create(
      libraryItemToCreateInput(template, {
        preco_venda: parsed.preco_venda ?? null,
        tempo_estimado_minutos: parsed.tempo_estimado_minutos,
      }),
    );
    revalidateCatalogAndAgenda(tenantSlug);
    return {
      success: true,
      id: created.id,
      nome: created.nome,
      minutes: created.tempo_estimado_minutos ?? template.defaultDurationMinutes ?? null,
      reused: false,
    };
  } catch (error) {
    const mapped = toActionError(
      error,
      "Erro ao adicionar o serviço sugerido.",
      "produtos.library.adopt-one",
    );
    return { success: false, error: mapped.error };
  }
}

export async function createCustomServiceForAgendaAction(
  tenantSlug: string,
  values: unknown,
): Promise<AdoptedServiceResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(
      tenantSlug,
      "produtos.criar",
    );
    const parsed = customServiceSchema.parse(values);
    const service = await createProdutoService(tenant.id);
    const existing = await service.listNamesForDedup();
    const reused = existing.find((row) => namesAreEquivalent(row.nome, parsed.nome));
    if (reused) {
      const row = await service.getById(reused.id);
      revalidateCatalogAndAgenda(tenantSlug);
      return {
        success: true,
        id: reused.id,
        nome: row?.nome ?? parsed.nome,
        minutes: row?.tempo_estimado_minutos ?? parsed.tempo_estimado_minutos ?? null,
        reused: true,
      };
    }

    const created = await service.create({
      nome: parsed.nome,
      tipo: "servico",
      unidade_medida: "UN",
      preco_venda: parsed.preco_venda ?? null,
      preco_sugerido: null,
      custo: null,
      tempo_estimado_minutos: parsed.tempo_estimado_minutos ?? null,
      ativo: true,
      controla_estoque: false,
      estoque_atual: 0,
    });
    revalidateCatalogAndAgenda(tenantSlug);
    return {
      success: true,
      id: created.id,
      nome: created.nome,
      minutes: created.tempo_estimado_minutos ?? parsed.tempo_estimado_minutos ?? null,
      reused: false,
    };
  } catch (error) {
    const mapped = toActionError(
      error,
      "Erro ao criar o serviço.",
      "produtos.library.create-custom",
    );
    return { success: false, error: mapped.error };
  }
}
