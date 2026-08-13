import type { SupabaseClient } from "@supabase/supabase-js";

import { getTenantSlugFromPath } from "@/lib/auth/routes";
import { pickPreferredTenantSlug } from "@/lib/tenant/active-tenant";
import { isActiveMembershipRow } from "@/lib/tenants/membership-status";
import type { Database } from "@/types/database";

type MembershipSlugRow = {
  tenant_id: string;
  status?: string | null;
  deactivated_at?: string | null;
};

export async function getUserTenantSlugs(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id, status, deactivated_at")
    .eq("user_id", userId);

  const active = ((memberships ?? []) as MembershipSlugRow[]).filter(
    isActiveMembershipRow,
  );

  if (!active.length) return [];

  const tenantIds = active.map((membership) => membership.tenant_id);

  const { data: tenants } = await supabase
    .from("tenants")
    .select("slug")
    .in("id", tenantIds);

  return tenants?.map((tenant) => tenant.slug) ?? [];
}

export function resolvePostLoginPath(
  tenantSlugs: string[],
  redirectTo?: string | null,
  preferredSlug?: string | null,
) {
  if (tenantSlugs.length > 0) {
    if (redirectTo) {
      const slug = getTenantSlugFromPath(redirectTo);
      if (slug && tenantSlugs.includes(slug)) {
        return redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;
      }
    }

    const chosen = pickPreferredTenantSlug(tenantSlugs, preferredSlug);
    return `/${chosen}/dashboard`;
  }

  return "/onboarding";
}

export async function getPostLoginPath(
  supabase: SupabaseClient<Database>,
  userId: string,
  redirectTo?: string | null,
  preferredSlug?: string | null,
) {
  const tenantSlugs = await getUserTenantSlugs(supabase, userId);
  return resolvePostLoginPath(tenantSlugs, redirectTo, preferredSlug);
}
