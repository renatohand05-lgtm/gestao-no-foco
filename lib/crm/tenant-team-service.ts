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
    .select("user_id")
    .eq("tenant_id", tenantId);

  if (error || !members?.length) return [];

  const userIds = members.map((m) => m.user_id);

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
