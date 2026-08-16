"use server";

import { revalidatePath } from "next/cache";

import { civilDateInTimezone, DEFAULT_TENANT_TIMEZONE } from "@/lib/dashboard/tenant-timezone";
import { MutationAuthError, requireTenantMutationPermission } from "@/lib/rbac/mutation-auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ActionResultWith } from "@/types/action-result";

import { communicationIdempotencyKey } from "./idempotency";
import { createCommunicationPreferenceService } from "./prefs-service";
import { createCustomerReturnService } from "./return-service";
import { createServiceReturnRuleService } from "./rule-service";
import { createNotificationOutboxService } from "./outbox-service";
import { EMPTY_RETURN_RULE } from "./returns";
import { renderTemplate, templateFor, type MessageTemplateCode } from "./templates";
import {
  manualReturnSchema,
  prefsSchema,
  returnStatusActionSchema,
  serviceRuleSchema,
} from "./validations";

function revalidateRetention(tenantSlug: string, clienteId?: string) {
  revalidatePath(`/${tenantSlug}/crm/retornos`);
  revalidatePath(`/${tenantSlug}/centro-operacoes`);
  revalidatePath(`/${tenantSlug}/agenda`);
  revalidatePath(`/${tenantSlug}/agenda/clientes`);
  if (clienteId) revalidatePath(`/${tenantSlug}/clientes/${clienteId}`);
}

async function loadCliente(tenantId: string, clienteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome, telefone, whatsapp, email")
    .eq("tenant_id", tenantId)
    .eq("id", clienteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createManualReturnAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const { tenant, userId } = await requireTenantMutationPermission(tenantSlug, [
      "crm.retornos.criar",
      "crm.criar",
    ]);
    const parsed = manualReturnSchema.parse(values);
    const svc = await createCustomerReturnService(tenant.id);
    const row = await svc.create(
      {
        clienteId: parsed.clienteId,
        intervalDays: parsed.presetDays ?? null,
        intervalMonths: parsed.intervalMonths ?? null,
        specificDate: parsed.specificDate ?? null,
        motivo: parsed.motivo,
        observacao: parsed.observacao,
        produtoId: parsed.produtoId,
        profissionalId: parsed.profissionalId,
        veiculoId: parsed.veiculoId,
        lastKm: parsed.lastKm,
        mileageKm: parsed.mileageKm,
        placa: parsed.placa,
        veiculoLabel: parsed.veiculoLabel,
        lastServiceLabel: parsed.lastServiceLabel,
        estimatedValue: parsed.estimatedValue,
        hideProcedure: parsed.hideProcedure,
        regraOrigem: parsed.presetDays ? "manual_preset" : "manual_data",
      },
      userId,
      civilDateInTimezone(new Date(), DEFAULT_TENANT_TIMEZONE),
    );
    revalidateRetention(tenantSlug, parsed.clienteId);
    return { success: true, id: row.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof MutationAuthError || error instanceof Error
          ? error.message
          : "Erro ao criar retorno.",
    };
  }
}

export async function setReturnStatusAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const { tenant, userId } = await requireTenantMutationPermission(tenantSlug, [
      "crm.retornos.editar",
      "crm.editar",
    ]);
    const parsed = returnStatusActionSchema.parse(values);
    const svc = await createCustomerReturnService(tenant.id);
    const row = await svc.setStatus(parsed.id, parsed.status, userId, {
      appointmentId: parsed.appointmentId,
    });
    revalidateRetention(tenantSlug, row.cliente_id);
    return { success: true, id: row.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar retorno.",
    };
  }
}

export async function updateCommunicationPrefsAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(tenantSlug, [
      "crm.retornos.editar",
      "clientes.editar",
    ]);
    const parsed = prefsSchema.parse(values);
    const svc = await createCommunicationPreferenceService(tenant.id);
    await svc.upsert(parsed.clienteId, parsed);
    revalidateRetention(tenantSlug, parsed.clienteId);
    return { success: true, id: parsed.clienteId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar preferências.",
    };
  }
}

export async function upsertServiceReturnRuleAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(tenantSlug, [
      "produtos.editar",
      "crm.retornos.editar",
    ]);
    const parsed = serviceRuleSchema.parse(values);
    const svc = await createServiceReturnRuleService(tenant.id);
    await svc.upsert(parsed.produtoId, {
      ...EMPTY_RETURN_RULE,
      returnEnabled: parsed.returnEnabled,
      returnType: parsed.returnType,
      intervalDays: parsed.intervalDays ?? null,
      intervalMonths: parsed.intervalMonths ?? null,
      mileageKm: parsed.mileageKm ?? null,
      hideProcedure: Boolean(parsed.hideProcedure),
      messageTemplate: parsed.messageTemplate ?? null,
    });
    revalidatePath(`/${tenantSlug}/produtos`);
    return { success: true, id: parsed.produtoId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar regra.",
    };
  }
}

export async function openReturnWhatsAppAction(
  tenantSlug: string,
  returnId: string,
  templateCode: MessageTemplateCode = "RETORNO_D3",
): Promise<ActionResultWith<{ waLink?: string; note: string }>> {
  try {
    const { tenant, userId } = await requireTenantMutationPermission(tenantSlug, [
      "crm.retornos.contatar",
      "crm.notificacoes.enviar",
    ]);
    const returns = await createCustomerReturnService(tenant.id);
    const row = await returns.getById(returnId);
    if (!row) throw new Error("Retorno não encontrado neste tenant.");
    const prefsSvc = await createCommunicationPreferenceService(tenant.id);
    const prefs = await prefsSvc.get(row.cliente_id);
    const cliente = await loadCliente(tenant.id, row.cliente_id);
    const hide = row.hide_procedure;
    const source = templateFor({
      code: templateCode,
      segment: tenant.segment,
      hideProcedure: hide,
    });
    const message = renderTemplate(source, {
      cliente_nome: cliente?.nome ?? "cliente",
      empresa_nome: tenant.name,
      data: row.due_at,
      servico: hide ? "" : (row.last_service_label ?? ""),
      veiculo: row.veiculo_label ?? "",
      placa: row.placa ?? "",
      dias_para_retorno: String(
        Math.max(
          0,
          Math.round(
            (Date.parse(`${row.due_at}T12:00:00`) - Date.now()) / 86400000,
          ),
        ),
      ),
    });
    const outbox = await createNotificationOutboxService(tenant.id);
    const result = await outbox.enqueue({
      clienteId: row.cliente_id,
      channel: "whatsapp",
      templateCode,
      offsetKey: "MANUAL",
      entityType: "retorno",
      entityId: row.id,
      idempotencyKey: communicationIdempotencyKey({
        tenantId: tenant.id,
        clienteId: row.cliente_id,
        entityType: "retorno",
        entityId: row.id,
        templateCode,
        offsetKey: "MANUAL",
        channel: "whatsapp",
      }),
      message,
      phone: cliente?.whatsapp ?? cliente?.telefone,
      optedIn: prefsSvc.isChannelAllowed(prefs, "whatsapp"),
      mode: "manual_link",
      userId,
    });
    if (!result.duplicated) {
      await returns.setStatus(row.id, "contatado", userId);
    }
    revalidateRetention(tenantSlug, row.cliente_id);
    return {
      success: true,
      id: row.id,
      waLink: result.waLink,
      note: result.note,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao gerar WhatsApp.",
    };
  }
}

export async function openAppointmentWhatsAppAction(
  tenantSlug: string,
  input: {
    eventId: string;
    clienteId: string;
    templateCode?: MessageTemplateCode;
    phone?: string | null;
    messageCtx?: Record<string, string>;
  },
): Promise<ActionResultWith<{ waLink?: string; note: string }>> {
  try {
    const { tenant, userId } = await requireTenantMutationPermission(tenantSlug, [
      "crm.notificacoes.enviar",
      "agenda.editar",
    ]);
    const prefsSvc = await createCommunicationPreferenceService(tenant.id);
    const prefs = await prefsSvc.get(input.clienteId);
    const code = input.templateCode ?? "LEMBRETE";
    const source = templateFor({ code, segment: tenant.segment });
    const message = renderTemplate(source, {
      empresa_nome: tenant.name,
      cliente_nome: input.messageCtx?.cliente_nome ?? "",
      data: input.messageCtx?.data ?? "",
      hora: input.messageCtx?.hora ?? "",
      servico: input.messageCtx?.servico ?? "",
      profissional: input.messageCtx?.profissional ?? "",
    });
    const outbox = await createNotificationOutboxService(tenant.id);
    const result = await outbox.enqueue({
      clienteId: input.clienteId,
      channel: "whatsapp",
      templateCode: code,
      offsetKey: "MANUAL",
      entityType: "agendamento",
      entityId: input.eventId,
      idempotencyKey: communicationIdempotencyKey({
        tenantId: tenant.id,
        clienteId: input.clienteId,
        entityType: "agendamento",
        entityId: input.eventId,
        templateCode: code,
        offsetKey: "MANUAL",
        channel: "whatsapp",
      }),
      message,
      phone: input.phone,
      optedIn: prefsSvc.isChannelAllowed(prefs, "whatsapp"),
      mode: "manual_link",
      userId,
    });
    revalidateRetention(tenantSlug, input.clienteId);
    return {
      success: true,
      id: input.eventId,
      waLink: result.waLink,
      note: result.note,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao gerar WhatsApp.",
    };
  }
}
