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
  // Se o link de destino aponta para uma empresa específica (ex: convite,
  // link direto), respeita — mesmo sendo dono/associado da plataforma.
  if (redirectTo) {
    const tenantSlugs = await getUserTenantSlugs(supabase, userId);
    const slug = getTenantSlugFromPath(redirectTo);
    if (slug && tenantSlugs.includes(slug)) {
      return redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;
    }
  }

  // Dono da plataforma ou associado: cai na Visão do Dono, não numa empresa
  // específica — mesmo padrão de segurança do resto do sistema (checa
  // platform_partners, nunca assume).
  const { data: partnerRow } = await supabase
    .from("platform_partners" as never)
    .select("role")
    .eq("user_id", userId)
    .maybeSingle<{ role: string }>();

  if (partnerRow) {
    return "/master/dashboard";
  }

  const tenantSlugs = await getUserTenantSlugs(supabase, userId);
  return resolvePostLoginPath(tenantSlugs, redirectTo, preferredSlug);
}
