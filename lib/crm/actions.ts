"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { createClienteAgendaService } from "@/lib/crm/cliente-agenda-service";
import { createClienteDocumentoStorageService } from "@/lib/crm/cliente-documento-storage-service";
import { createClienteTarefaService } from "@/lib/crm/cliente-tarefa-service";
import { createClienteTimelineService } from "@/lib/crm/cliente-timeline-service";
import { createCrmFunilService } from "@/lib/crm/crm-funnel-service";
import {
  CRM_AGENDA_TIPOS,
  CRM_DOCUMENTO_CATEGORIAS,
  CRM_FUNIL_STAGES,
  CRM_TAREFA_STATUS,
  CRM_TAREFA_TIPOS,
} from "@/lib/crm/constants";
import { toActionError } from "@/lib/supabase/friendly-error";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

function revalidateCrmPaths(tenantSlug: string, clienteId?: string) {
  revalidatePath(`/${tenantSlug}/clientes`);
  revalidatePath(`/${tenantSlug}/clientes/funil`);
  revalidatePath(`/${tenantSlug}/clientes/dashboard`);
  revalidatePath(`/${tenantSlug}/clientes/tarefas`);
  revalidatePath(`/${tenantSlug}/clientes/agenda`);
  if (clienteId) {
    revalidatePath(`/${tenantSlug}/clientes/${clienteId}`);
  }
}

export async function moveFunilStageAction(
  tenantSlug: string,
  clienteId: string,
  estagio: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const stage = z.enum(CRM_FUNIL_STAGES).parse(estagio);
    const service = await createCrmFunilService(tenant.id);
    await service.moveToStage(clienteId, stage);

    try {
      const timeline = await createClienteTimelineService(tenant.id);
      await timeline.record({
        clienteId,
        tipo: "funil",
        titulo: `Estágio alterado para ${stage}`,
        userId: user?.id ?? null,
      });
    } catch {
      /* opcional */
    }

    revalidateCrmPaths(tenantSlug, clienteId);
    return { success: true, id: clienteId };
  } catch (error) {
    return toActionError(error, "Erro ao mover no funil.", "crm.moveFunil");
  }
}

export async function createClienteTarefaAction(
  tenantSlug: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const parsed = z
      .object({
        cliente_id: z.string().uuid(),
        tipo: z.enum(CRM_TAREFA_TIPOS),
        titulo: z.string().trim().min(2),
        descricao: z.string().trim().optional().or(z.literal("")),
        data_vencimento: z.string().optional().or(z.literal("")),
        responsavel_id: z.string().uuid().optional().or(z.literal("")),
        prioridade: z.string().optional(),
      })
      .parse(input);

    const service = await createClienteTarefaService(tenant.id);
    const tarefa = await service.create(
      {
        cliente_id: parsed.cliente_id,
        tipo: parsed.tipo,
        titulo: parsed.titulo,
        descricao: parsed.descricao || null,
        data_vencimento: parsed.data_vencimento || null,
        responsavel_id: parsed.responsavel_id || null,
        prioridade: parsed.prioridade,
      },
      user?.id ?? null,
    );

    try {
      const timeline = await createClienteTimelineService(tenant.id);
      await timeline.record({
        clienteId: parsed.cliente_id,
        tipo: "tarefa",
        titulo: `Tarefa criada: ${parsed.titulo}`,
        referencia_tipo: "cliente_tarefa",
        referencia_id: tarefa.id,
        userId: user?.id ?? null,
      });
    } catch {
      /* opcional */
    }

    revalidateCrmPaths(tenantSlug, parsed.cliente_id);
    return { success: true, id: tarefa.id };
  } catch (error) {
    return toActionError(error, "Erro ao criar tarefa.", "crm.createTarefa");
  }
}

export async function updateClienteTarefaStatusAction(
  tenantSlug: string,
  tarefaId: string,
  status: string,
  clienteId?: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const parsedStatus = z.enum(CRM_TAREFA_STATUS).parse(status);
    const service = await createClienteTarefaService(tenant.id);
    await service.updateStatus(tarefaId, parsedStatus);

    if (clienteId) {
      try {
        const timeline = await createClienteTimelineService(tenant.id);
        await timeline.record({
          clienteId,
          tipo: "tarefa",
          titulo: `Tarefa atualizada: ${parsedStatus.replace("_", " ")}`,
          referencia_tipo: "cliente_tarefa",
          referencia_id: tarefaId,
          userId: user?.id ?? null,
        });
      } catch {
        /* opcional */
      }
    }

    revalidateCrmPaths(tenantSlug, clienteId);
    return { success: true, id: tarefaId };
  } catch (error) {
    return toActionError(error, "Erro ao atualizar tarefa.", "crm.updateTarefa");
  }
}

export async function createClienteAgendamentoAction(
  tenantSlug: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const parsed = z
      .object({
        cliente_id: z.string().uuid(),
        titulo: z.string().trim().min(2),
        descricao: z.string().trim().optional().or(z.literal("")),
        tipo: z.enum(CRM_AGENDA_TIPOS).optional(),
        inicio: z.string().min(1),
        fim: z.string().optional().or(z.literal("")),
        local: z.string().trim().optional().or(z.literal("")),
        responsavel_id: z.string().uuid().optional().or(z.literal("")),
      })
      .parse(input);

    const service = await createClienteAgendaService(tenant.id);
    const ag = await service.create(
      {
        cliente_id: parsed.cliente_id,
        titulo: parsed.titulo,
        descricao: parsed.descricao || null,
        tipo: parsed.tipo,
        inicio: parsed.inicio,
        fim: parsed.fim || null,
        local: parsed.local || null,
        responsavel_id: parsed.responsavel_id || null,
      },
      user?.id ?? null,
    );

    try {
      const timeline = await createClienteTimelineService(tenant.id);
      await timeline.record({
        clienteId: parsed.cliente_id,
        tipo: "agenda",
        titulo: `Agendamento: ${parsed.titulo}`,
        referencia_tipo: "cliente_agendamento",
        referencia_id: ag.id,
        userId: user?.id ?? null,
      });
    } catch {
      /* opcional */
    }

    revalidateCrmPaths(tenantSlug, parsed.cliente_id);
    return { success: true, id: ag.id };
  } catch (error) {
    return toActionError(error, "Erro ao agendar.", "crm.createAgendamento");
  }
}

export async function recordClienteObservacaoAction(
  tenantSlug: string,
  clienteId: string,
  texto: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const descricao = z.string().trim().min(2).parse(texto);
    const timeline = await createClienteTimelineService(tenant.id);
    await timeline.record({
      clienteId,
      tipo: "observacao",
      titulo: "Observação registrada",
      descricao,
      userId: user?.id ?? null,
    });
    revalidateCrmPaths(tenantSlug, clienteId);
    return { success: true, id: clienteId };
  } catch (error) {
    return toActionError(error, "Erro ao registrar observação.", "crm.observacao");
  }
}

export async function uploadClienteDocumentoAction(
  tenantSlug: string,
  formData: FormData,
): Promise<ActionResult & { signedUrl?: string }> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const user = await getCurrentUser();
    const file = formData.get("file");
    const clienteId = String(formData.get("clienteId") ?? "");
    const categoria = String(formData.get("categoria") ?? "outro");
    const legenda = String(formData.get("legenda") ?? "");

    if (!(file instanceof File)) {
      throw new Error("Selecione um arquivo.");
    }

    z.string().uuid().parse(clienteId);
    z.enum(CRM_DOCUMENTO_CATEGORIAS).parse(categoria);

    const service = await createClienteDocumentoStorageService(tenant.id);
    const doc = await service.upload(
      file,
      {
        clienteId,
        categoria,
        legenda: legenda || file.name,
      },
      user?.id ?? null,
    );

    try {
      const timeline = await createClienteTimelineService(tenant.id);
      await timeline.record({
        clienteId,
        tipo: "documento",
        titulo: `Documento anexado: ${doc.legenda ?? doc.nome_arquivo}`,
        referencia_tipo: "cliente_documento",
        referencia_id: doc.id,
        userId: user?.id ?? null,
      });
    } catch {
      /* opcional */
    }

    revalidateCrmPaths(tenantSlug, clienteId);
    return { success: true, id: doc.id };
  } catch (error) {
    return toActionError(error, "Erro ao enviar documento.", "crm.uploadDocumento");
  }
}

export async function deleteClienteDocumentoAction(
  tenantSlug: string,
  documentoId: string,
  clienteId: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createClienteDocumentoStorageService(tenant.id);
    await service.softDelete(documentoId);
    revalidateCrmPaths(tenantSlug, clienteId);
    return { success: true, id: documentoId };
  } catch (error) {
    return toActionError(error, "Erro ao excluir documento.", "crm.deleteDocumento");
  }
}

export async function getClienteDocumentoSignedUrlAction(
  tenantSlug: string,
  documentoId: string,
): Promise<ActionResult & { signedUrl?: string }> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createClienteDocumentoStorageService(tenant.id);
    const { signedUrl } = await service.createSignedUrl(documentoId);
    return { success: true, signedUrl };
  } catch (error) {
    return toActionError(error, "Erro ao abrir documento.", "crm.documentoUrl");
  }
}
