"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createRecursosOcupacaoService,
  RECURSO_STATUS,
  RECURSO_TIPOS,
} from "@/lib/operacoes/recursos-service";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { toActionError } from "@/lib/supabase/friendly-error";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult } from "@/types/action-result";

const recursoSchema = z.object({
  nome: z.string().min(1, "Informe o nome."),
  codigo: z.string().optional().nullable(),
  tipo: z.enum(RECURSO_TIPOS),
  status: z.enum(RECURSO_STATUS).optional(),
  capacidade: z.coerce.number().optional().nullable(),
  centro_custo_id: z.string().uuid().optional().nullable().or(z.literal("")),
  observacoes: z.string().optional().nullable(),
  data_manutencao: z.string().optional().nullable(),
  proxima_manutencao: z.string().optional().nullable(),
  responsavel_id: z.string().uuid().optional().nullable().or(z.literal("")),
  ativo: z.boolean().optional(),
});

function revalidateRecursos(tenantSlug: string, osId?: string) {
  revalidatePath(`/${tenantSlug}/centro-operacoes`);
  revalidatePath(`/${tenantSlug}/centro-operacoes/recursos`);
  revalidatePath(`/${tenantSlug}/ordens`);
  if (osId) revalidatePath(`/${tenantSlug}/ordens/${osId}`);
}

export async function createRecursoAction(
  tenantSlug: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const perms = await createPermissionService(tenant.id, tenant.role);
    await perms.require("centro_operacoes.visualizar");
    const parsed = recursoSchema.parse(values);
    const service = await createRecursosOcupacaoService(tenant.id);
    const id = await service.create({
      ...parsed,
      centro_custo_id: parsed.centro_custo_id || null,
      responsavel_id: parsed.responsavel_id || null,
    });
    revalidateRecursos(tenantSlug);
    return { success: true, id };
  } catch (error) {
    return toActionError(error, "Erro ao cadastrar recurso.", "recursos.create");
  }
}

export async function updateRecursoAction(
  tenantSlug: string,
  id: string,
  values: unknown,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const perms = await createPermissionService(tenant.id, tenant.role);
    await perms.require("centro_operacoes.visualizar");
    const parsed = recursoSchema.partial().parse(values);
    const service = await createRecursosOcupacaoService(tenant.id);
    await service.update(id, {
      ...parsed,
      centro_custo_id: parsed.centro_custo_id || null,
      responsavel_id: parsed.responsavel_id || null,
    });
    revalidateRecursos(tenantSlug);
    return { success: true, id };
  } catch (error) {
    return toActionError(error, "Erro ao atualizar recurso.", "recursos.update");
  }
}

export async function setRecursoStatusAction(
  tenantSlug: string,
  id: string,
  status: string,
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const parsed = z.enum(RECURSO_STATUS).parse(status);
    const service = await createRecursosOcupacaoService(tenant.id);
    await service.setStatus(id, parsed);
    revalidateRecursos(tenantSlug);
    return { success: true, id };
  } catch (error) {
    return toActionError(error, "Erro ao alterar status.", "recursos.status");
  }
}

export async function removeRecursoAction(
  tenantSlug: string,
  id: string,
): Promise<ActionResult & { mode?: string }> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const service = await createRecursosOcupacaoService(tenant.id);
    const mode = await service.removeOrArchive(id);
    revalidateRecursos(tenantSlug);
    return { success: true, id, mode };
  } catch (error) {
    return toActionError(error, "Erro ao remover recurso.", "recursos.remove");
  }
}

export async function vincularOsRecursoAction(
  tenantSlug: string,
  ordemId: string,
  recursoId: string | null,
  modo: "ocupar" | "reservar" | "liberar",
): Promise<ActionResult> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const profile = await getCurrentProfile();
    const perms = await createPermissionService(tenant.id, tenant.role);
    await perms.require("centro_operacoes.alterar_status");
    const service = await createRecursosOcupacaoService(tenant.id);
    await service.vincularOs(
      ordemId,
      recursoId,
      modo,
      profile?.id ?? null,
    );
    revalidateRecursos(tenantSlug, ordemId);
    return { success: true, id: ordemId };
  } catch (error) {
    return toActionError(
      error,
      "Erro ao vincular recurso.",
      "recursos.vincular",
    );
  }
}
