"use server";

import { revalidatePath } from "next/cache";

import { createRbacSupabaseAdapter } from "@/lib/enterprise";
import {
  createMesa,
  deleteMesa,
  linkComandaToMesa,
  listMesas,
  listOpenComandas,
  releaseMesa,
  updateMesaStatus,
  type Mesa,
  type MesaStatus,
  type OpenComanda,
} from "@/lib/restaurante/mesas";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import type { ActionResult, ActionResultWith } from "@/types/action-result";

function revalidateSalao(tenantSlug: string) {
  revalidatePath(`/${tenantSlug}/salao`);
}

async function requireMesaPerm(tenantSlug: string) {
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
  const ok = perms.has("os.visualizar") || perms.has("os.criar");
  if (!ok) {
    throw new Error("Sem permissão para gerenciar mesas.");
  }
  return { tenant, profile };
}

function toActionError(error: unknown, fallback: string): ActionResult {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

export async function listMesasAction(
  tenantSlug: string,
): Promise<ActionResultWith<{ mesas: Mesa[] }>> {
  try {
    const { tenant } = await requireMesaPerm(tenantSlug);
    const client = await createClient();
    const mesas = await listMesas(client, tenant.id);
    return { success: true, mesas };
  } catch (error) {
    return toActionError(error, "Erro ao carregar mesas.") as ActionResultWith<{
      mesas: Mesa[];
    }>;
  }
}

export async function listOpenComandasAction(
  tenantSlug: string,
): Promise<ActionResultWith<{ comandas: OpenComanda[] }>> {
  try {
    const { tenant } = await requireMesaPerm(tenantSlug);
    const client = await createClient();
    const comandas = await listOpenComandas(client, tenant.id);
    return { success: true, comandas };
  } catch (error) {
    return toActionError(
      error,
      "Erro ao carregar comandas abertas.",
    ) as ActionResultWith<{ comandas: OpenComanda[] }>;
  }
}

export async function createMesaAction(
  tenantSlug: string,
  input: { numero: string; capacidade: number | null; observacoes: string | null },
): Promise<ActionResult> {
  try {
    const { tenant } = await requireMesaPerm(tenantSlug);
    if (!input.numero.trim()) {
      return { success: false, error: "Informe o número/nome da mesa." };
    }
    const client = await createClient();
    await createMesa(client, {
      tenantId: tenant.id,
      numero: input.numero.trim(),
      capacidade: input.capacidade,
      observacoes: input.observacoes?.trim() || null,
    });
    revalidateSalao(tenantSlug);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Erro ao criar mesa.");
  }
}

export async function updateMesaStatusAction(
  tenantSlug: string,
  input: { mesaId: string; status: MesaStatus },
): Promise<ActionResult> {
  try {
    const { tenant } = await requireMesaPerm(tenantSlug);
    const client = await createClient();
    await updateMesaStatus(client, {
      tenantId: tenant.id,
      mesaId: input.mesaId,
      status: input.status,
    });
    revalidateSalao(tenantSlug);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Erro ao atualizar status da mesa.");
  }
}

export async function linkComandaToMesaAction(
  tenantSlug: string,
  input: { mesaId: string; ordemServicoId: string },
): Promise<ActionResult> {
  try {
    const { tenant } = await requireMesaPerm(tenantSlug);
    const client = await createClient();
    await linkComandaToMesa(client, {
      tenantId: tenant.id,
      mesaId: input.mesaId,
      ordemServicoId: input.ordemServicoId,
    });
    revalidateSalao(tenantSlug);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Erro ao vincular comanda à mesa.");
  }
}

export async function releaseMesaAction(
  tenantSlug: string,
  input: { mesaId: string },
): Promise<ActionResult> {
  try {
    const { tenant } = await requireMesaPerm(tenantSlug);
    const client = await createClient();
    await releaseMesa(client, { tenantId: tenant.id, mesaId: input.mesaId });
    revalidateSalao(tenantSlug);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Erro ao liberar mesa.");
  }
}

export async function deleteMesaAction(
  tenantSlug: string,
  input: { mesaId: string },
): Promise<ActionResult> {
  try {
    const { tenant } = await requireMesaPerm(tenantSlug);
    const client = await createClient();
    await deleteMesa(client, { tenantId: tenant.id, mesaId: input.mesaId });
    revalidateSalao(tenantSlug);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Erro ao excluir mesa.");
  }
}
