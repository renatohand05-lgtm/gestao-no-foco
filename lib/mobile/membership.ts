import type { SupabaseClient } from "@supabase/supabase-js";

import { hasConfirmedBillingAccess } from "@/lib/billing/access-gate";
import type { TenantRole } from "@/lib/constants";
import { isActiveMembershipRow } from "@/lib/tenants/membership-status";
import type { Database } from "@/types/database";

type MembershipRow = {
  role: string;
  status?: string | null;
  deactivated_at?: string | null;
};

export function isInactiveMembership(membership: MembershipRow): boolean {
  return !isActiveMembershipRow(membership);
}

async function isPlatformOwnerUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("platform_partners" as never)
    .select("role")
    .eq("user_id", userId)
    .maybeSingle<{ role: string }>();
  return data?.role === "owner";
}

export async function getActiveMembership(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  userId: string,
): Promise<{ role: TenantRole } | null> {
  const { data, error } = await supabase
    .from("tenant_members")
    .select("role, status, deactivated_at")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || isInactiveMembership(data)) return null;

  const role = data.role as TenantRole;
  if (!["owner", "admin", "manager", "member"].includes(role)) return null;

  // Trava de acesso (mesma regra do site): empresa nova sem assinatura
  // ativa não acessa via mobile também — exceto o dono da plataforma,
  // que precisa entrar pra dar suporte independente do pagamento.
  const [owner, confirmedAccess] = await Promise.all([
    isPlatformOwnerUser(supabase, userId),
    hasConfirmedBillingAccess(supabase, tenantId),
  ]);
  if (!owner && !confirmedAccess) return null;

  return { role };
}
