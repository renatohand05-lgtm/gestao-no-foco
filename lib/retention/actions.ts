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
import { createCommunicationSettingsService } from "./settings-service";
import { renderTemplate, templateFor, type MessageTemplateCode } from "./templates";
import {
  manualReturnSchema,
  prefsSchema,
  returnStatusActionSchema,
  serviceRuleSchema,
} from "./validations";

function revalidateRetention(tenantSlug: string, clienteId?: string) {
  revalidatePath(`/${tenantSlug}/crm/retornos`);
  revalidatePath(`/${tenantSlug}/crm/comunicacoes`);
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
    const { tenant, userId } = await requireTenantMutationPermission(tenantSlug, [
      "crm.retornos.editar",
      "clientes.editar",
    ]);
    const parsed = prefsSchema.parse(values);
    const svc = await createCommunicationPreferenceService(tenant.id);
    await svc.upsert(parsed.clienteId, {
      ...parsed,
      origin: "manual",
      userId,
    });
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

function segmentInput(tenant: {
  segment?: string | null;
  segment_version?: number | null;
  segment_config?: Record<string, unknown> | null;
}) {
  return {
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  };
}

export async function finalizeServiceReadyAction(
  tenantSlug: string,
  values: unknown,
): Promise<
  ActionResultWith<{
    status: string;
    note?: string;
    waLink?: string;
    duplicated?: boolean;
  }>
> {
  try {
    const parsed = (await import("./validations")).finalizeServiceReadySchema.parse(
      values,
    );
    const needed = parsed.notify
      ? (["os.finalizar", "crm.notificacoes.enviar"] as const)
      : (["os.finalizar"] as const);
    const { tenant, userId } = await requireTenantMutationPermission(
      tenantSlug,
      needed,
    );
    const { resolveSegmentContext } = await import("@/lib/segments/resolve.ts");
    const { serviceReadyAllowed, formatServiceReadyFinalizeNote } = await import(
      "./service-ready"
    );
    const ctx = resolveSegmentContext(segmentInput(tenant));
    if (!serviceReadyAllowed(ctx)) {
      return {
        success: false,
        error: "Serviço pronto não se aplica a este segmento.",
      };
    }
    const { createOrdemServicoService } = await import(
      "@/lib/ordens/ordem-servico-service"
    );
    const osSvc = await createOrdemServicoService(tenant.id);
    const os = await osSvc.getById(parsed.osId);
    if (!os) {
      return { success: false, error: "Atendimento não encontrado neste tenant." };
    }
    await osSvc.marcarAguardandoRetirada(parsed.osId, userId);
    let note = "Finalizado sem notificar o cliente.";
    let waLink: string | undefined;
    let duplicated = false;
    let status = "pronto_para_entrega";
    if (parsed.notify) {
      try {
        const { enqueueCustomerNotification } = await import("./notify");
        const { osServiceSummary, osVehicleSummary } = await import(
          "./os-message-context"
        );
        const messageCtx = {
          servico: osServiceSummary(os.itens, tenant.segment),
          veiculo: osVehicleSummary({
            marca: os.marca,
            modelo: os.modelo,
            placa: os.placa,
          }),
          modelo: os.modelo ?? "",
          placa: os.placa ?? "",
        };
        const requested = (
          parsed.channels && parsed.channels.length > 0
            ? parsed.channels
            : parsed.channel
              ? [parsed.channel]
              : []
        ).filter((ch): ch is "whatsapp" | "email" => ch === "whatsapp" || ch === "email");
        const channels = requested.length > 0 ? requested : [undefined];
        const channelResults: Array<{
          channel: "whatsapp" | "email";
          status: string;
          note: string;
        }> = [];
        for (const ch of channels) {
          const result = await enqueueCustomerNotification({
            tenantId: tenant.id,
            tenantName: tenant.name,
            segment: tenant.segment,
            clienteId: os.cliente_id,
            entityType: "os",
            entityId: os.id,
            templateCode: "SERVICE_READY",
            offsetKey: "SERVICE_READY",
            messageCtx,
            userId,
            forceChannel: ch,
            explicit: true,
          });
          waLink = result.waLink ?? waLink;
          duplicated = duplicated || result.duplicated;
          for (const row of result.channels) {
            channelResults.push({
              channel: row.channel as "whatsapp" | "email",
              status: row.status,
              note: row.note,
            });
          }
        }
        const { whatsappHealth, emailHealth } = await import("./providers/runtime.ts");
        note = formatServiceReadyFinalizeNote({
          notify: true,
          requested,
          channels: channelResults,
          whatsappProviderConfigured: whatsappHealth().canSendReal,
          emailProviderConfigured: emailHealth().canSendReal,
          duplicated,
        });
        status = "pronto_para_entrega";
      } catch (error) {
        const { logger } = await import("@/lib/observability/logger");
        logger.error("finalizeServiceReady.notify_failed", {
          tenantId: tenant.id,
          osId: parsed.osId,
          message: error instanceof Error ? error.message : "notify error",
        });
        note = "OS finalizada. Não foi possível enviar a notificação.";
        status = "pronto_para_entrega";
      }
    }
    revalidateRetention(tenantSlug, os.cliente_id);
    revalidatePath(`/${tenantSlug}/crm/comunicacoes`);
    revalidatePath(`/${tenantSlug}/ordens/${os.id}`);
    return { success: true, id: os.id, status, note, waLink, duplicated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao finalizar.",
    };
  }
}

export async function registerOsPickupAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const parsed = (await import("./validations")).registerPickupSchema.parse(
      values,
    );
    const { tenant, userId } = await requireTenantMutationPermission(tenantSlug, [
      "os.finalizar",
    ]);
    const { createOrdemServicoService } = await import(
      "@/lib/ordens/ordem-servico-service"
    );
    const osSvc = await createOrdemServicoService(tenant.id);
    const os = await osSvc.registrarRetirada(
      parsed.osId,
      userId,
      parsed.observacao,
    );
    if (!os) {
      return { success: false, error: "Atendimento não encontrado neste tenant." };
    }
    const settings = await createCommunicationSettingsService(tenant.id).then((s) =>
      s.get(),
    );
    if (settings.sendDelivery) {
      const { enqueueCustomerNotification } = await import("./notify");
      await enqueueCustomerNotification({
        tenantId: tenant.id,
        tenantName: tenant.name,
        segment: tenant.segment,
        clienteId: os.cliente_id,
        entityType: "os",
        entityId: os.id,
        templateCode: "SERVICE_DELIVERED",
        offsetKey: "SERVICE_DELIVERED",
        messageCtx: {},
        userId,
      });
    }
    revalidateRetention(tenantSlug, os.cliente_id);
    revalidatePath(`/${tenantSlug}/ordens/${os.id}`);
    return { success: true, id: os.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao registrar retirada.",
    };
  }
}

export async function notifyServiceReadyAgainAction(
  tenantSlug: string,
  osId: string,
): Promise<
  ActionResultWith<{ note: string; duplicated?: boolean; waLink?: string }>
> {
  try {
    const { tenant, userId } = await requireTenantMutationPermission(tenantSlug, [
      "crm.notificacoes.enviar",
    ]);
    const { createOrdemServicoService } = await import(
      "@/lib/ordens/ordem-servico-service"
    );
    const os = await (await createOrdemServicoService(tenant.id)).getById(osId);
    if (!os) {
      return { success: false, error: "Atendimento não encontrado neste tenant." };
    }
    const { enqueueCustomerNotification } = await import("./notify");
    const { osServiceSummary, osVehicleSummary } = await import(
      "./os-message-context"
    );
    const result = await enqueueCustomerNotification({
      tenantId: tenant.id,
      tenantName: tenant.name,
      segment: tenant.segment,
      clienteId: os.cliente_id,
      entityType: "os",
      entityId: os.id,
      templateCode: "SERVICE_READY",
      offsetKey: "SERVICE_READY",
      messageCtx: {
        servico: osServiceSummary(os.itens, tenant.segment),
        veiculo: osVehicleSummary({
          marca: os.marca,
          modelo: os.modelo,
          placa: os.placa,
        }),
        modelo: os.modelo ?? "",
        placa: os.placa ?? "",
      },
      userId,
      explicit: true,
    });
    revalidateRetention(tenantSlug, os.cliente_id);
    return {
      success: true,
      id: os.id,
      note: result.duplicated
        ? "Mensagem já registrada — reenvio bloqueado."
        : result.note,
      duplicated: result.duplicated,
      waLink: result.waLink,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao notificar.",
    };
  }
}

export async function updateCommunicationSettingsAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(tenantSlug, [
      "configuracoes.editar",
    ]);
    const parsed = (
      await import("./validations")
    ).communicationSettingsSchema.parse(values);
    const svc = await createCommunicationSettingsService(tenant.id);
    await svc.upsert(parsed);
    revalidatePath(`/${tenantSlug}/configuracoes`);
    revalidatePath(`/${tenantSlug}/configuracoes/comunicacoes`);
    return { success: true, id: tenant.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar.",
    };
  }
}

export async function resendFailedNotificationAction(
  tenantSlug: string,
  outboxId: string,
): Promise<ActionResultWith<{ note: string }>> {
  try {
    const { tenant, userId } = await requireTenantMutationPermission(tenantSlug, [
      "crm.notificacoes.enviar",
    ]);
    const parsed = (await import("./validations")).resendNotificationSchema.parse({
      outboxId,
    });
    const outbox = await createNotificationOutboxService(tenant.id);
    const row = await outbox.getById(parsed.outboxId);
    if (!row) {
      return { success: false, error: "Mensagem não encontrada neste tenant." };
    }
    const { canManualResend } = await import("./resend");
    const prefsSvc = await createCommunicationPreferenceService(tenant.id);
    const prefs = row.cliente_id ? await prefsSvc.get(row.cliente_id) : null;
    const optedIn = prefs
      ? prefsSvc.isChannelAllowed(prefs, row.channel as "whatsapp" | "email")
      : false;
    const guard = canManualResend({
      actorTenantId: tenant.id,
      rowTenantId: row.tenant_id,
      status: row.status,
      failureKind: row.failure_kind,
      optedIn,
      hasDestination: Boolean(row.to_address),
    });
    if (!guard.ok) {
      return { success: false, error: guard.note };
    }
    await outbox.auditResend(row.id, userId);
    const retried = await outbox.retryDispatch(row);
    if (row.cliente_id) {
      revalidateRetention(tenantSlug, row.cliente_id);
    }
    if (row.entity_type === "os" && row.entity_id) {
      revalidatePath(`/${tenantSlug}/ordens/${row.entity_id}`);
    }
    return {
      success: true,
      id: row.id,
      note: retried.note || "Reenvio preparado. Não duplica a mensagem original.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao reenviar.",
    };
  }
}
