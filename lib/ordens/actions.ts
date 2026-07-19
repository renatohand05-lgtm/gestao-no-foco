"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { createOrdemServicoService } from "@/lib/ordens/ordem-servico-service";
import {
  createVeiculoService,
  type VeiculoOption,
} from "@/lib/ordens/veiculo-service";
import {
  osAprovacaoFormSchema,
  osDiagnosticoFormSchema,
  osEntregaFormSchema,
  osExecucaoFormSchema,
  osFaturarFormSchema,
  osHeaderUpdateFormSchema,
  osItemFormSchema,
  osOpenFormSchema,
  osPrevisaoFormSchema,
  osRetornoFormSchema,
  osStatusFormSchema,
  osVeiculoVinculoFormSchema,
  veiculoFormSchema,
  veiculoUpdateFormSchema,
} from "@/lib/ordens/validations";
import { toActionError } from "@/lib/supabase/friendly-error";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

function revalidateOs(tenantSlug: string, id?: string) {
  revalidatePath(`/${tenantSlug}/ordens`);
  if (id) {
    revalidatePath(`/${tenantSlug}/ordens/${id}`);
  }
  revalidatePath(`/${tenantSlug}/ordens/qualidade-operacional`);
  revalidatePath(`/${tenantSlug}/vendas`);
  revalidatePath(`/${tenantSlug}/financeiro`);
}

export async function listVeiculosByClienteAction(
  tenantSlug: string,
  clienteId: string,
): Promise<
  | { success: true; veiculos: VeiculoOption[] }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    if (!clienteId) {
      return { success: true, veiculos: [] };
    }
    const service = await createVeiculoService(tenant.id);
    const veiculos = await service.listOptionsByCliente(clienteId);
    return { success: true, veiculos };
  } catch (error) {
    return toActionError(error, "Erro ao listar veículos.", "veiculos.list");
  }
}

export async function createOrdemServicoAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osOpenFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    const os = await service.create(parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, os.id);
    return { success: true, id: os.id };
  } catch (error) {
    return toActionError(error, "Erro ao abrir OS.", "ordens.create");
  }
}

export async function updateOsVeiculoAction(
  tenantSlug: string,
  osId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osVeiculoVinculoFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.updateVeiculoVinculo(
      osId,
      parsed.veiculo_id,
      profile?.id ?? null,
    );
    revalidateOs(tenantSlug, osId);
    return { success: true, id: osId };
  } catch (error) {
    return toActionError(error, "Erro ao vincular veículo.", "ordens.veiculo");
  }
}

export async function updateOsHeaderAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osHeaderUpdateFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.updateOsHeader(id, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, id);
    return { success: true, id };
  } catch (error) {
    return toActionError(error, "Erro ao atualizar OS.", "ordens.update");
  }
}

export async function updateOsItemAction(
  tenantSlug: string,
  osId: string,
  itemId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osItemFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.updateItem(osId, itemId, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, osId);
    return { success: true, id: osId };
  } catch (error) {
    return toActionError(error, "Erro ao atualizar item.", "ordens.item.update");
  }
}

export async function removeOsItemAction(
  tenantSlug: string,
  osId: string,
  itemId: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const service = await createOrdemServicoService(tenant.id);
    await service.removeItem(osId, itemId, profile?.id ?? null);
    revalidateOs(tenantSlug, osId);
    return { success: true, id: osId };
  } catch (error) {
    return toActionError(error, "Erro ao remover item.", "ordens.item.remove");
  }
}

export async function changeOsStatusAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osStatusFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.changeStatus(id, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, id);
    return { success: true, id };
  } catch (error) {
    return toActionError(error, "Erro ao alterar status.", "ordens.status");
  }
}

export async function addOsItemAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osItemFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.addItem(id, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, id);
    return { success: true, id };
  } catch (error) {
    return toActionError(error, "Erro ao adicionar item.", "ordens.item");
  }
}

export async function saveOsDiagnosticoAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osDiagnosticoFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.saveDiagnostico(id, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, id);
    return { success: true, id };
  } catch (error) {
    return toActionError(error, "Erro ao salvar diagnóstico.", "ordens.diagnostico");
  }
}

export async function applyOsAprovacaoAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osAprovacaoFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.applyAprovacao(id, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, id);
    return { success: true, id };
  } catch (error) {
    return toActionError(error, "Erro na aprovação.", "ordens.aprovacao");
  }
}

export async function updateOsItemExecucaoAction(
  tenantSlug: string,
  osId: string,
  itemId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osExecucaoFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.updateItemExecucao(osId, itemId, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, osId);
    return { success: true, id: osId };
  } catch (error) {
    return toActionError(error, "Erro na execução.", "ordens.execucao");
  }
}

export async function updateOsPrevisaoAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osPrevisaoFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.updatePrevisao(id, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, id);
    return { success: true, id };
  } catch (error) {
    return toActionError(error, "Erro ao alterar previsão.", "ordens.previsao");
  }
}

export async function concluirOsEntregaAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osEntregaFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.concluirEntrega(id, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, id);
    return { success: true, id };
  } catch (error) {
    return toActionError(error, "Erro na entrega.", "ordens.entrega");
  }
}

export async function faturarOsAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osFaturarFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    const vendaId = await service.faturar(id, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, id);
    return { success: true, id: vendaId };
  } catch (error) {
    return toActionError(error, "Erro ao faturar OS.", "ordens.faturar");
  }
}

export async function createOsRetornoAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osRetornoFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    const retornoId = await service.createRetorno(id, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, id);
    return { success: true, id: retornoId };
  } catch (error) {
    return toActionError(error, "Erro ao registrar retorno.", "ordens.retorno");
  }
}

export async function updateOsChecklistAction(
  tenantSlug: string,
  osId: string,
  checklistId: string,
  status: string,
  observacao?: string | null,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const service = await createOrdemServicoService(tenant.id);
    await service.updateChecklistItem(
      osId,
      checklistId,
      status,
      observacao ?? null,
      profile?.id ?? null,
    );
    revalidateOs(tenantSlug, osId);
    return { success: true, id: osId };
  } catch (error) {
    return toActionError(error, "Erro no checklist.", "ordens.checklist");
  }
}

export async function updateVeiculoAction(
  tenantSlug: string,
  veiculoId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = veiculoUpdateFormSchema.parse(values);
    const service = await createVeiculoService(tenant.id);
    const veiculo = await service.update(veiculoId, parsed);
    revalidatePath(`/${tenantSlug}/ordens`);
    return { success: true, id: veiculo.id };
  } catch (error) {
    return toActionError(error, "Erro ao atualizar veículo.", "veiculos.update");
  }
}

export async function createVeiculoAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = veiculoFormSchema.parse(values);
    const service = await createVeiculoService(tenant.id);
    const veiculo = await service.create(parsed);
    revalidatePath(`/${tenantSlug}/ordens`);
    revalidatePath(`/${tenantSlug}/ordens/nova`);
    return { success: true, id: veiculo.id };
  } catch (error) {
    return toActionError(error, "Erro ao cadastrar veículo.", "veiculos.create");
  }
}
