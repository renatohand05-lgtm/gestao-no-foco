import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Checa platform_partners.role = 'owner' usando um client já autenticado (mobile ou web). */
export async function isPlatformOwnerClient(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("platform_partners" as never)
    .select("role")
    .eq("user_id", userId)
    .maybeSingle<{ role: string }>();
  return data?.role === "owner";
}
