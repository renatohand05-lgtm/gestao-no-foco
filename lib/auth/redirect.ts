import type { SupabaseClient } from "@supabase/supabase-js";

import { getTenantSlugFromPath } from "@/lib/auth/routes";
import type { Database } from "@/types/database";

export async function getUserTenantSlugs(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId);

  if (!memberships?.length) return [];

  const tenantIds = memberships.map((membership) => membership.tenant_id);

  const { data: tenants } = await supabase
    .from("tenants")
    .select("slug")
    .in("id", tenantIds);

  return tenants?.map((tenant) => tenant.slug) ?? [];
}

export function resolvePostLoginPath(
  tenantSlugs: string[],
  redirectTo?: string | null,
) {
  if (tenantSlugs.length > 0) {
    if (redirectTo) {
      const slug = getTenantSlugFromPath(redirectTo);
      if (slug && tenantSlugs.includes(slug)) {
        return redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;
      }
    }

    return `/${tenantSlugs[0]}/dashboard`;
  }

  return "/onboarding";
}

export async function getPostLoginPath(
  supabase: SupabaseClient<Database>,
  userId: string,
  redirectTo?: string | null,
) {
  const tenantSlugs = await getUserTenantSlugs(supabase, userId);
  return resolvePostLoginPath(tenantSlugs, redirectTo);
}
