"use server";

import { createRbacSupabaseAdapter } from "@/lib/enterprise";
import { listKitchenItems, type KitchenItem } from "@/lib/restaurante/cozinha";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import type { ActionResultWith } from "@/types/action-result";

async function requireKitchenPerm(tenantSlug: string) {
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
  const ok = perms.has("os.visualizar") || perms.has("os.editar");
  if (!ok) {
    throw new Error("Sem permissão para ver a cozinha.");
  }
  return { tenant, profile };
}

export async function listKitchenItemsAction(
  tenantSlug: string,
): Promise<ActionResultWith<{ items: KitchenItem[] }>> {
  try {
    const { tenant } = await requireKitchenPerm(tenantSlug);
    const client = await createClient();
    const items = await listKitchenItems(client, tenant.id);
    return { success: true, items };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao carregar a cozinha.",
    } as ActionResultWith<{ items: KitchenItem[] }>;
  }
}
