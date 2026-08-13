import type { SupabaseClient } from "@supabase/supabase-js";

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

  return { role };
}
