"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  cancelEnrollment,
  createSequence,
  enrollClientes,
  listSequences,
  searchClientesForEnrollment,
  toggleSequenceActive,
  type CrmSequenceStepInput,
} from "@/lib/crm/sequence-service";
import { requireTenantMutationPermission } from "@/lib/rbac/mutation-auth";
import { requireTenant } from "@/lib/tenants";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ActionResultWith } from "@/types/action-result";

export async function createSequenceAction(
  tenantSlug: string,
  nome: string,
  steps: CrmSequenceStepInput[],
): Promise<ActionResultWith<{ sequenceId: string }>> {
  try {
    const { tenant } = await requireTenantMutationPermission(tenantSlug, "crm.criar");
    const profile = await getCurrentProfile();
    const client = await createClient();

    const sequenceId = await createSequence(
      client,
      tenant.id,
      nome,
      steps,
      profile?.id ?? null,
    );

    revalidatePath(`/${tenantSlug}/crm/automacao`);
    return { success: true, sequenceId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao criar a sequência.",
    };
  }
}

export async function listSequencesAction(tenantSlug: string) {
  try {
    const tenant = await requireTenant(tenantSlug);
    const client = await createClient();
    const sequences = await listSequences(client, tenant.id);
    return { success: true as const, data: sequences };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha ao listar sequências.",
    };
  }
}

export async function toggleSequenceActiveAction(
  tenantSlug: string,
  sequenceId: string,
  ativo: boolean,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(tenantSlug, "crm.editar");
    const client = await createClient();
    await toggleSequenceActive(client, tenant.id, sequenceId, ativo);

    revalidatePath(`/${tenantSlug}/crm/automacao`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao atualizar a sequência.",
    };
  }
}

export async function enrollClientesAction(
  tenantSlug: string,
  sequenceId: string,
  clienteIds: string[],
): Promise<ActionResultWith<{ inscritos: number; jaInscritos: number }>> {
  try {
    const { tenant } = await requireTenantMutationPermission(tenantSlug, "crm.criar");
    const profile = await getCurrentProfile();
    const client = await createClient();

    const result = await enrollClientes(
      client,
      tenant.id,
      sequenceId,
      clienteIds,
      profile?.id ?? null,
    );

    revalidatePath(`/${tenantSlug}/crm/automacao`);
    return { success: true, ...result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao inscrever clientes.",
    };
  }
}

export async function cancelEnrollmentAction(
  tenantSlug: string,
  enrollmentId: string,
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantMutationPermission(tenantSlug, "crm.editar");
    const client = await createClient();
    await cancelEnrollment(client, tenant.id, enrollmentId);

    revalidatePath(`/${tenantSlug}/crm/automacao`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao cancelar inscrição.",
    };
  }
}

export async function searchClientesAction(tenantSlug: string, query: string) {
  try {
    const tenant = await requireTenant(tenantSlug);
    const client = await createClient();
    const results = await searchClientesForEnrollment(client, tenant.id, query);
    return { success: true as const, data: results };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Falha na busca.",
    };
  }
}
