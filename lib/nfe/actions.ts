"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { createNfeEntradaService } from "@/lib/nfe/nfe-entrada-service";
import { NfeParseError } from "@/lib/nfe/nfe-xml-parser";
import { toActionError } from "@/lib/supabase/friendly-error";
import { requireTenant } from "@/lib/tenants";
import type { NfeDestino } from "@/types/nfe-entrada";

function fail(message: string) {
  return { success: false as const, error: message };
}

export async function uploadNfeXmlAction(tenantSlug: string, formData: FormData) {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const file = formData.get("xml");
    if (!(file instanceof File)) {
      return fail("Selecione um arquivo XML.");
    }
    const xml = await file.text();
    const service = await createNfeEntradaService(tenant.id);
    const result = await service.importXml({
      xml,
      filename: file.name,
      mimeType: file.type,
      userId: profile?.id ?? null,
    });
    revalidatePath(`/${tenantSlug}/estoque/notas-fiscais`);
    return {
      success: true as const,
      notaId: result.notaId,
      duplicated: result.duplicated,
    };
  } catch (error) {
    if (error instanceof NfeParseError) {
      return fail(error.message);
    }
    return toActionError(error, "Erro ao importar XML.", "nfe.upload");
  }
}

export async function updateNfeItemAction(
  tenantSlug: string,
  notaId: string,
  itemId: string,
  values: {
    produto_id?: string | null;
    destino?: NfeDestino;
    quantidade_estoque?: number;
    quantidade_os?: number;
    ordem_servico_id?: string | null;
    motivo_ignorar?: string | null;
  },
) {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const service = await createNfeEntradaService(tenant.id);
    await service.updateItem(
      notaId,
      itemId,
      {
        ...values,
        status_vinculo: values.produto_id ? "vinculado" : undefined,
      },
      profile?.id ?? null,
    );
    revalidatePath(`/${tenantSlug}/estoque/notas-fiscais/${notaId}`);
    revalidatePath(`/${tenantSlug}/estoque/notas-fiscais/${notaId}/conferencia`);
    return { success: true as const };
  } catch (error) {
    return toActionError(error, "Erro ao atualizar item.", "nfe.update_item");
  }
}

export async function updateNfeHeaderAction(
  tenantSlug: string,
  notaId: string,
  values: {
    fornecedor_id?: string | null;
    gerar_conta_pagar?: boolean;
    categoria_financeira_id?: string | null;
    plano_conta_id?: string | null;
    centro_custo_id?: string | null;
    observacoes?: string | null;
    data_entrada?: string | null;
  },
) {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const service = await createNfeEntradaService(tenant.id);
    await service.updateHeader(notaId, values, profile?.id ?? null);
    revalidatePath(`/${tenantSlug}/estoque/notas-fiscais/${notaId}`);
    revalidatePath(`/${tenantSlug}/estoque/notas-fiscais/${notaId}/conferencia`);
    return { success: true as const };
  } catch (error) {
    return toActionError(error, "Erro ao atualizar nota.", "nfe.update_header");
  }
}

export async function processNfeImportAction(tenantSlug: string, notaId: string) {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const service = await createNfeEntradaService(tenant.id);
    const result = await service.processImport(notaId, profile?.id ?? null);
    revalidatePath(`/${tenantSlug}/estoque/notas-fiscais`);
    revalidatePath(`/${tenantSlug}/estoque/notas-fiscais/${notaId}`);
    revalidatePath(`/${tenantSlug}/estoque`);
    revalidatePath(`/${tenantSlug}/financeiro/contas-pagar`);
    return { success: true as const, ...result };
  } catch (error) {
    return toActionError(error, "Erro ao processar importação.", "nfe.process");
  }
}
