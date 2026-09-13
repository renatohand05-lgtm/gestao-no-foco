"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { buildContagemHtml } from "@/lib/estoque/estoque-contagem-pdf-service";
import { createEstoqueContagemService } from "@/lib/estoque/estoque-contagem-service";
import { renderPdfBuffer } from "@/lib/ordens/inspecao-pdf-service";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";
import type {
  ContagemPeriodicidade,
  FecharContagemResult,
} from "@/types/estoque-contagem";

function toActionError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function revalidateContagemPaths(tenantSlug: string, id?: string) {
  revalidatePath(`/${tenantSlug}/estoque/contagem`);
  if (id) revalidatePath(`/${tenantSlug}/estoque/contagem/${id}`);
}

export async function createContagemAction(
  tenantSlug: string,
  periodicidade: ContagemPeriodicidade,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const service = await createEstoqueContagemService(tenant.id);
    const contagem = await service.create(
      { periodicidade },
      profile?.id ?? null,
    );

    revalidateContagemPaths(tenantSlug, contagem.id);
    return { success: true, id: contagem.id };
  } catch (error) {
    return {
      success: false,
      error: toActionError(error, "Erro ao abrir contagem de estoque."),
    };
  }
}

export async function salvarItemContagemAction(
  tenantSlug: string,
  contagemId: string,
  produtoId: string,
  quantidadeContada: number,
  observacao?: string | null,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createEstoqueContagemService(tenant.id);
    await service.salvarItem(contagemId, {
      produto_id: produtoId,
      quantidade_contada: quantidadeContada,
      observacao,
    });

    revalidatePath(`/${tenantSlug}/estoque/contagem/${contagemId}`);
    return { success: true, id: contagemId };
  } catch (error) {
    return {
      success: false,
      error: toActionError(error, "Erro ao salvar item contado."),
    };
  }
}

export async function fecharContagemAction(
  tenantSlug: string,
  contagemId: string,
): Promise<
  | { success: true; id: string; resultado: FecharContagemResult }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const service = await createEstoqueContagemService(tenant.id);
    const resultado = await service.fechar(contagemId, profile?.id ?? null);

    revalidateContagemPaths(tenantSlug, contagemId);
    revalidatePath(`/${tenantSlug}/estoque`);
    revalidatePath(`/${tenantSlug}/dashboard`);
    revalidatePath(`/${tenantSlug}/financeiro/dre`);

    return { success: true, id: contagemId, resultado };
  } catch (error) {
    return {
      success: false,
      error: toActionError(error, "Erro ao fechar contagem."),
    };
  }
}

export async function excluirContagemAction(
  tenantSlug: string,
  contagemId: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createEstoqueContagemService(tenant.id);
    await service.softDelete(contagemId);

    revalidateContagemPaths(tenantSlug);
    return { success: true, id: contagemId };
  } catch (error) {
    return {
      success: false,
      error: toActionError(error, "Erro ao excluir contagem."),
    };
  }
}

export async function getContagemPdfAction(
  tenantSlug: string,
  contagemId: string,
): Promise<
  | { success: true; base64: string; filename: string }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createEstoqueContagemService(tenant.id);
    const detail = await service.getById(contagemId);
    if (!detail) throw new Error("Contagem não encontrada.");

    const html = buildContagemHtml({
      empresaNome: tenant.name ?? "Empresa",
      periodicidade: detail.periodicidade,
      dataInicio: detail.data_inicio,
      status: detail.status,
      itens: detail.itens.map((item) => ({
        nome: item.produto?.nome ?? "Produto removido",
        sku: item.produto?.sku ?? null,
        unidade: item.produto?.unidade_medida ?? "un",
        quantidadeSistema: item.quantidade_sistema,
      })),
    });
    const buffer = await renderPdfBuffer(html);
    const base64 = buffer.toString("base64");
    const filename = `contagem-estoque-${detail.data_inicio}.pdf`;

    return { success: true, base64, filename };
  } catch (error) {
    return {
      success: false,
      error: toActionError(error, "Erro ao gerar PDF da folha de contagem."),
    };
  }
}
