import { createClient } from "@/lib/supabase/server";

export type TenantMemberOption = {
  id: string;
  nome: string;
  email: string | null;
};

export async function listTenantMembersForSelect(
  tenantId: string,
): Promise<TenantMemberOption[]> {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("tenant_members")
    .select("user_id, status, deactivated_at")
    .eq("tenant_id", tenantId);

  if (error || !members?.length) return [];

  const userIds = members
    .filter((m) => {
      const row = m as {
        status?: string | null;
        deactivated_at?: string | null;
      };
      if (row.deactivated_at) return false;
      if (row.status != null && row.status !== "active") return false;
      return true;
    })
    .map((m) => m.user_id);

  if (!userIds.length) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  return (profiles ?? []).map((p) => ({
    id: p.id,
    nome: p.full_name?.trim() || p.email || p.id.slice(0, 8),
    email: p.email,
  }));
}
