"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import { createOrdemServicoService } from "@/lib/ordens/ordem-servico-service";
import {
  createVeiculoService,
  type VeiculoOption,
} from "@/lib/ordens/veiculo-service";
import { createDescontoService } from "@/lib/descontos/desconto-service";
import {
  abrirOsComClienteAtomico,
  createOsClienteSearchService,
  type OsAbrirDuplicate,
  type OsSearchHit,
} from "@/lib/ordens/os-abrir-rpc";
import {
  osAprovacaoFormSchema,
  osDescontoFormSchema,
  osDiagnosticoFormSchema,
  osEntregaFormSchema,
  osExecucaoFormSchema,
  osFaturarFormSchema,
  osHeaderUpdateFormSchema,
  osItemFormSchema,
  osMotivoFormSchema,
  osConverterItemSchema,
  osOpenFormSchema,
  osOpenIntegratedSchema,
  osPrevisaoFormSchema,
  osRetornoFormSchema,
  osStatusFormSchema,
  osVeiculoVinculoFormSchema,
  veiculoFormSchema,
  veiculoUpdateFormSchema,
} from "@/lib/ordens/validations";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { createClient } from "@/lib/supabase/server";
import { toActionError } from "@/lib/supabase/friendly-error";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";
import type { TenantRole } from "@/lib/constants";

function revalidateOs(tenantSlug: string, id?: string) {
  revalidatePath(`/${tenantSlug}/ordens`);
  if (id) {
    revalidatePath(`/${tenantSlug}/ordens/${id}`);
  }
  revalidatePath(`/${tenantSlug}/ordens/qualidade-operacional`);
  revalidatePath(`/${tenantSlug}/ordens/dashboard`);
  revalidatePath(`/${tenantSlug}/ordens/mecanicos`);
  revalidatePath(`/${tenantSlug}/centro-operacoes`);
  revalidatePath(`/${tenantSlug}/vendas`);
  revalidatePath(`/${tenantSlug}/vendas/dashboard`);
  revalidatePath(`/${tenantSlug}/dashboard`);
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

export type CreateOsIntegratedResult =
  | { success: true; id: string }
  | { success: false; error: string; duplicates?: OsAbrirDuplicate[] };

export async function createOrdemServicoIntegradaAction(
  tenantSlug: string,
  values: unknown,
): Promise<CreateOsIntegratedResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const parsed = osOpenIntegratedSchema.parse(values);
    const supabase = await createClient();

    if (parsed.force_create) {
      const perms = await createPermissionService(
        tenant.id,
        (tenant.role ?? "member") as TenantRole,
      );
      await perms.require(
        "os.criar_cliente_forcado",
        "Sem permissão para criar cliente apesar da duplicidade.",
      );
    }

    const result = await abrirOsComClienteAtomico(
      supabase,
      tenant.id,
      {
        mode: parsed.mode,
        cliente_id: parsed.cliente_id || undefined,
        veiculo_id: parsed.veiculo_id || undefined,
        cliente: parsed.cliente
          ? {
              ...parsed.cliente,
              origem: parsed.cliente.origem || "ordem_de_servico",
            }
          : undefined,
        veiculo: parsed.veiculo,
        os: {
          quilometragem_entrada: parsed.quilometragem_entrada,
          reclamacao_cliente: parsed.reclamacao_cliente,
          observacoes: parsed.observacoes,
          nivel_combustivel: parsed.nivel_combustivel,
          objetos_deixados: parsed.objetos_deixados,
          danos_aparentes: parsed.danos_aparentes,
          origem_atendimento: parsed.origem_atendimento || "balcao",
          prioridade: parsed.prioridade,
          previsao_entrega: parsed.previsao_entrega,
        },
      },
      profile?.id ?? null,
      parsed.force_create,
    );

    if (!result.ok) {
      return {
        success: false,
        error: "Possível cadastro duplicado. Revise ou use o existente.",
        duplicates: result.duplicates,
      };
    }

    revalidateOs(tenantSlug, result.os_id);
    revalidatePath(`/${tenantSlug}/clientes`);
    if (result.created_cliente) {
      revalidatePath(`/${tenantSlug}/clientes/${result.cliente_id}`);
    }
    return { success: true, id: result.os_id };
  } catch (error) {
    return toActionError(error, "Erro ao abrir OS.", "ordens.createIntegrated");
  }
}

export async function searchClientesOsAction(
  tenantSlug: string,
  q: string,
): Promise<
  | { success: true; hits: OsSearchHit[] }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createOsClienteSearchService(tenant.id);
    const hits = await service.search(q);
    return { success: true, hits };
  } catch (error) {
    return toActionError(error, "Erro na busca.", "ordens.searchClientes");
  }
}

export async function aplicarDescontoOsAction(
  tenantSlug: string,
  osId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const role = (tenant.role ?? "member") as TenantRole;
    const perms = await createPermissionService(tenant.id, role);
    await perms.require("desconto.aplicar");

    const parsed = osDescontoFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    const os = await service.getById(osId);
    if (!os) throw new Error("OS não encontrada.");
    if (["faturado", "cancelado", "cancelada"].includes(os.status)) {
      throw new Error("Não é possível alterar desconto nesta OS.");
    }

    const descontoSvc = await createDescontoService(tenant.id);
    const avaliacao = await descontoSvc.avaliarAsync({
      valorOriginal: Number(os.subtotal ?? os.valor_total ?? 0),
      descontoValor: parsed.desconto_valor,
      descontoPercentual: parsed.desconto_percentual,
      motivo: parsed.desconto_motivo,
      tipo: parsed.desconto_tipo,
      solicitanteId: profile?.id ?? null,
      role,
    });

    if (avaliacao.status === "bloqueado") {
      throw new Error(avaliacao.motivoBloqueio);
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("ordens_servico")
      .update({
        desconto_valor: avaliacao.valorDesconto,
        desconto_percentual: avaliacao.percentual,
        desconto_total: avaliacao.valorDesconto,
        desconto_motivo: parsed.desconto_motivo,
        desconto_tipo: parsed.desconto_tipo,
        desconto_cliente_recorrente: parsed.desconto_cliente_recorrente,
        desconto_solicitado_por: profile?.id ?? null,
        desconto_autorizado_por:
          avaliacao.status === "aprovado" ? (profile?.id ?? null) : null,
        desconto_autorizado_em:
          avaliacao.status === "aprovado" ? new Date().toISOString() : null,
        desconto_status: avaliacao.status,
        desconto_observacao: parsed.desconto_observacao ?? null,
        valor_total: avaliacao.valorFinal,
      })
      .eq("id", osId)
      .eq("tenant_id", tenant.id);

    if (error) throw new Error(error.message);

    await descontoSvc.recordEvent({
      entidadeTipo: "os",
      entidadeId: osId,
      clienteId: os.cliente_id,
      solicitanteId: profile?.id ?? null,
      autorizadorId:
        avaliacao.status === "aprovado" ? (profile?.id ?? null) : null,
      cargoAutorizador: avaliacao.autorizadorCargo,
      valorOriginal: Number(os.subtotal ?? os.valor_total ?? 0),
      valorDesconto: avaliacao.valorDesconto,
      percentual: avaliacao.percentual,
      valorFinal: avaliacao.valorFinal,
      tipoDesconto: parsed.desconto_tipo,
      motivo: parsed.desconto_motivo,
      status:
        avaliacao.status === "aprovado" ? "aprovado" : "pendente",
      observacao: parsed.desconto_observacao,
    });

    revalidateOs(tenantSlug, osId);
    return { success: true, id: osId };
  } catch (error) {
    return toActionError(error, "Erro ao aplicar desconto.", "ordens.desconto");
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
    const perms = await createPermissionService(tenant.id, tenant.role);
    await perms.require("os.editar");
    if (parsed.is_personalizado) {
      await perms.require("os.adicionar_item_personalizado");
    }
    const service = await createOrdemServicoService(tenant.id);
    await service.addItem(id, parsed, profile?.id ?? null);
    revalidateOs(tenantSlug, id);
    return { success: true, id };
  } catch (error) {
    return toActionError(error, "Erro ao adicionar item.", "ordens.item");
  }
}

export async function searchCatalogoOsAction(
  tenantSlug: string,
  q: string,
  tipo: "produto" | "servico" | "all" = "all",
): Promise<
  | {
      success: true;
      items: Array<{
        id: string;
        nome: string;
        tipo: string;
        codigo_interno: string | null;
        sku: string | null;
        codigo_barras: string | null;
        categoria: string | null;
        preco_venda: number;
        custo: number | null;
        estoque_atual: number;
        margem_percent: number | null;
      }>;
    }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createOrdemServicoService(tenant.id);
    const items = await service.searchCatalogoOs(q, tipo);
    return { success: true, items };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao buscar catálogo.",
    };
  }
}

export async function previewPersonalizadoOsAction(
  tenantSlug: string,
  descricao: string,
): Promise<
  | {
      success: true;
      recorrencia: number;
      semelhantes: Array<{ id: string; nome: string; tipo: string }>;
    }
  | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createOrdemServicoService(tenant.id);
    const [recorrencia, semelhantes] = await Promise.all([
      service.countPersonalizadoRecorrencia(descricao),
      service.findCatalogoSemelhante(descricao),
    ]);
    return {
      success: true,
      recorrencia,
      semelhantes: semelhantes.map((s) => ({
        id: s.id,
        nome: s.nome,
        tipo: s.tipo,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao analisar item.",
    };
  }
}

export async function converterOsItemPersonalizadoAction(
  tenantSlug: string,
  osId: string,
  itemId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const perms = await createPermissionService(tenant.id, tenant.role);
    await perms.require("os.converter_item_personalizado");
    const parsed = osConverterItemSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.converterItemPersonalizado(
      osId,
      itemId,
      parsed.produto_id,
      profile?.id ?? null,
      parsed.motivo,
    );
    revalidateOs(tenantSlug, osId);
    return { success: true, id: osId };
  } catch (error) {
    return toActionError(
      error,
      "Erro ao converter item.",
      "ordens.item.convert",
    );
  }
}

export async function cancelarOsAction(
  tenantSlug: string,
  osId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const perms = await createPermissionService(tenant.id, tenant.role);
    await perms.require("os.cancelar");
    const parsed = osMotivoFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.cancelarOs(osId, parsed.motivo, profile?.id ?? null);
    revalidateOs(tenantSlug, osId);
    return { success: true, id: osId };
  } catch (error) {
    return toActionError(error, "Erro ao cancelar OS.", "ordens.cancelar");
  }
}

export async function arquivarOsAction(
  tenantSlug: string,
  osId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const perms = await createPermissionService(tenant.id, tenant.role);
    await perms.require("os.arquivar");
    const parsed = osMotivoFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.arquivarOs(osId, parsed.motivo, profile?.id ?? null);
    revalidateOs(tenantSlug, osId);
    return { success: true, id: osId };
  } catch (error) {
    return toActionError(error, "Erro ao arquivar OS.", "ordens.arquivar");
  }
}

export async function excluirRascunhoOsAction(
  tenantSlug: string,
  osId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const perms = await createPermissionService(tenant.id, tenant.role);
    await perms.require("os.excluir_rascunho");
    const parsed = osMotivoFormSchema.parse(values);
    const service = await createOrdemServicoService(tenant.id);
    await service.excluirRascunho(osId, parsed.motivo, profile?.id ?? null);
    revalidatePath(`/${tenantSlug}/ordens`);
    revalidatePath(`/${tenantSlug}/ordens/dashboard`);
    return { success: true, id: osId };
  } catch (error) {
    return toActionError(
      error,
      "Erro ao excluir rascunho.",
      "ordens.excluir_rascunho",
    );
  }
}

export async function restaurarOsAction(
  tenantSlug: string,
  osId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const perms = await createPermissionService(tenant.id, tenant.role);
    await perms.require("os.restaurar");
    const motivo =
      typeof values === "object" &&
      values &&
      "motivo" in values &&
      typeof (values as { motivo?: unknown }).motivo === "string"
        ? (values as { motivo: string }).motivo
        : null;
    const service = await createOrdemServicoService(tenant.id);
    await service.restaurarOs(osId, motivo, profile?.id ?? null);
    revalidateOs(tenantSlug, osId);
    return { success: true, id: osId };
  } catch (error) {
    return toActionError(error, "Erro ao restaurar OS.", "ordens.restaurar");
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
