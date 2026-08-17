"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createAgendaEventService,
  type AgendaEventStatus,
} from "@/lib/agenda/agenda-service";
import {
  agendaEventFormSchema,
  agendaEventStatusSchema,
} from "@/lib/agenda/validations";
import { createRbacSupabaseAdapter } from "@/lib/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult, ActionResultWith } from "@/types/action-result";

function revalidateAgenda(tenantSlug: string, id?: string) {
  revalidatePath(`/${tenantSlug}/agenda`);
  revalidatePath(`/${tenantSlug}/agenda/clientes`);
  revalidatePath(`/${tenantSlug}/crm/agenda`);
  revalidatePath(`/${tenantSlug}/crm/retornos`);
  revalidatePath(`/${tenantSlug}/clientes/agenda`);
  if (id) revalidatePath(`/${tenantSlug}/agenda/${id}`);
}

async function requireAgendaPerm(
  tenantSlug: string,
  needed: readonly string[],
) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) throw new Error("Sessão ausente.");

  const elevated =
    tenant.role === "owner" ||
    tenant.role === "admin" ||
    tenant.role === "manager";
  if (elevated) return { tenant, profile };

  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const perms = new Set(snap.permissions ?? []);
  const ok = needed.some((p) => perms.has(p));
  if (!ok) {
    throw new Error(`Sem permissão (${needed.join(" | ")}).`);
  }
  return { tenant, profile };
}

function toInput(parsed: ReturnType<typeof agendaEventFormSchema.parse>) {
  return {
    titulo: parsed.titulo,
    tipo: parsed.tipo,
    natureza: parsed.natureza,
    servico_id: parsed.servico_id,
    veiculo_id: parsed.veiculo_id,
    duracao_minutos: parsed.duracao_minutos,
    lembrete_minutos: parsed.lembrete_minutos,
    meeting_url: parsed.meeting_url,
    return_id: parsed.return_id,
    inicio: parsed.inicio,
    fim: parsed.fim,
    dia_inteiro: parsed.dia_inteiro,
    responsavel_id: parsed.responsavel_id,
    recurso_id: parsed.recurso_id,
    cliente_id: parsed.cliente_id,
    ordem_servico_id: parsed.ordem_servico_id,
    venda_id: parsed.venda_id,
    observacao: parsed.observacao,
    endereco: parsed.endereco,
    filial_id: parsed.filial_id,
    empresa_id: parsed.empresa_id,
    override_conflito: parsed.override_conflito,
    override_justificativa: parsed.override_justificativa,
    recorrencia:
      parsed.recorrencia_frequency === "nenhuma"
        ? null
        : {
            frequency: parsed.recorrencia_frequency as
              | "diaria"
              | "semanal"
              | "mensal",
            count: parsed.recorrencia_count,
          },
  };
}

export async function createAgendaEventAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResultWith<{ commNote?: string }>> {
  try {
    const { tenant, profile } = await requireAgendaPerm(tenantSlug, [
      "agenda.criar",
      "crm.criar",
    ]);
    const parsed = agendaEventFormSchema.parse(values);
    if (parsed.override_conflito) {
      await requireAgendaPerm(tenantSlug, ["agenda.sobrescrever_conflito"]);
    }
    const svc = await createAgendaEventService(tenant.id);
    const rows = await svc.create(toInput(parsed), profile.id);
    let commNote: string | undefined;
    try {
      const first = rows[0];
      if (first?.cliente_id && parsed.natureza === "cliente") {
        const { enqueueCustomerNotification } = await import(
          "@/lib/retention/notify"
        );
        const queued = await enqueueCustomerNotification({
          tenantId: tenant.id,
          tenantName: tenant.name,
          segment: tenant.segment,
          clienteId: first.cliente_id,
          entityType: "agendamento",
          entityId: first.id,
          templateCode: "AGENDAMENTO_CRIADO",
          offsetKey: "CREATED",
          messageCtx: {
            data: first.inicio?.slice(0, 10) ?? "",
            hora: first.inicio
              ? new Date(first.inicio).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
            servico: parsed.titulo,
          },
          userId: profile.id,
        });
        commNote =
          queued.status === "suppressed" ||
          queued.note.includes("sem canal")
            ? "Cliente sem canal disponível"
            : "Confirmação preparada";
      }
    } catch {
      /* outbox não bloqueia o agendamento */
    }
    revalidateAgenda(tenantSlug, rows[0]?.id);
    return { success: true, id: rows[0]?.id, commNote };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar evento.",
    };
  }
}

export async function updateAgendaEventAction(
  tenantSlug: string,
  eventId: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireAgendaPerm(tenantSlug, [
      "agenda.editar",
      "crm.editar",
    ]);
    const parsed = agendaEventFormSchema.parse(values);
    const svc = await createAgendaEventService(tenant.id);
    await svc.update(eventId, toInput(parsed));
    revalidateAgenda(tenantSlug, eventId);
    return { success: true, id: eventId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao editar evento.",
    };
  }
}

export async function cancelAgendaEventAction(
  tenantSlug: string,
  eventId: string,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireAgendaPerm(tenantSlug, [
      "agenda.editar",
      "crm.editar",
    ]);
    const svc = await createAgendaEventService(tenant.id);
    await svc.cancel(eventId);
    revalidateAgenda(tenantSlug, eventId);
    return { success: true, id: eventId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao cancelar evento.",
    };
  }
}

export async function deleteAgendaEventAction(
  tenantSlug: string,
  eventId: string,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireAgendaPerm(tenantSlug, [
      "agenda.excluir",
      "crm.excluir",
    ]);
    const svc = await createAgendaEventService(tenant.id);
    await svc.softDelete(eventId);
    revalidateAgenda(tenantSlug);
    return { success: true, id: eventId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir evento.",
    };
  }
}

export async function duplicateAgendaEventAction(
  tenantSlug: string,
  eventId: string,
): Promise<ActionResult> {
  try {
    const { tenant, profile } = await requireAgendaPerm(tenantSlug, [
      "agenda.criar",
      "crm.criar",
    ]);
    const svc = await createAgendaEventService(tenant.id);
    const row = await svc.duplicate(eventId, profile.id);
    revalidateAgenda(tenantSlug, row.id);
    return { success: true, id: row.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao duplicar evento.",
    };
  }
}

export async function setAgendaEventStatusAction(
  tenantSlug: string,
  eventId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireAgendaPerm(tenantSlug, [
      "agenda.editar",
      "crm.editar",
    ]);
    const parsed = agendaEventStatusSchema.parse(status);
    const svc = await createAgendaEventService(tenant.id);
    await svc.setStatus(eventId, parsed as AgendaEventStatus);
    revalidateAgenda(tenantSlug, eventId);
    return { success: true, id: eventId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao alterar status.",
    };
  }
}

export async function rescheduleAgendaEventAction(
  tenantSlug: string,
  eventId: string,
  inicio: string,
  fim: string,
  override = false,
  justificativa?: string | null,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireAgendaPerm(tenantSlug, [
      "agenda.editar",
      "crm.editar",
    ]);
    const svc = await createAgendaEventService(tenant.id);
    await svc.reschedule(eventId, inicio, fim, override, justificativa);
    revalidateAgenda(tenantSlug, eventId);
    return { success: true, id: eventId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao reagendar.",
    };
  }
}
