"use server";

import { createRbacSupabaseAdapter } from "@/lib/enterprise";
import { listDeliveryOrders, type DeliveryOrder } from "@/lib/restaurante/delivery";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import type { ActionResultWith } from "@/types/action-result";

async function requireDeliveryPerm(tenantSlug: string) {
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
    throw new Error("Sem permissão para ver o delivery.");
  }
  return { tenant, profile };
}

export async function listDeliveryOrdersAction(
  tenantSlug: string,
): Promise<ActionResultWith<{ orders: DeliveryOrder[] }>> {
  try {
    const { tenant } = await requireDeliveryPerm(tenantSlug);
    const client = await createClient();
    const orders = await listDeliveryOrders(client, tenant.id);
    return { success: true, orders };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao carregar delivery.",
    } as ActionResultWith<{ orders: DeliveryOrder[] }>;
  }
}
