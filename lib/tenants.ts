import { cache } from "react";
import { redirect } from "next/navigation";

import type { TenantRole } from "@/lib/constants";
import { logger } from "@/lib/observability/logger";
import { createClient } from "@/lib/supabase/server";
import { isActiveMembershipRow } from "@/lib/tenants/membership-status";
import type { Tenant, TenantWithRole } from "@/types";

type MembershipQueryRow = {
  role: string;
  tenant_id: string;
  status?: string | null;
  deactivated_at?: string | null;
};

export const getUserTenants = cache(async (): Promise<TenantWithRole[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("role, tenant_id, status, deactivated_at")
    .eq("user_id", user.id);

  const active = ((memberships ?? []) as MembershipQueryRow[]).filter(
    isActiveMembershipRow,
  );

  if (!active.length) return [];

  const tenantIds = active.map((membership) => membership.tenant_id);

  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .in("id", tenantIds);

  if (!tenants) return [];

  return tenants.map((tenant) => ({
    ...(tenant as Tenant),
    role: active.find((membership) => membership.tenant_id === tenant.id)!
      .role as TenantRole,
  }));
});

export const getTenantBySlug = cache(
  async (slug: string): Promise<TenantWithRole | null> => {
    const tenants = await getUserTenants();
    return tenants.find((tenant) => tenant.slug === slug) ?? null;
  },
);

export const requireTenant = cache(async (slug: string): Promise<TenantWithRole> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const tenants = await getUserTenants();
  const tenant = tenants.find((item) => item.slug === slug) ?? null;

  if (!tenant) {
    logger.warn("tenant_context_denied", {
      attemptedSlug: slug,
      userId: user.id,
      authorizedCount: tenants.length,
    });

    const { data: partnerRow } = await supabase
      .from("platform_partners" as never)
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle<{ role: string }>();

    if (partnerRow) {
      redirect("/master/dashboard");
    }

    const fallback = tenants[0]?.slug;
    redirect(fallback ? `/${fallback}/dashboard` : "/onboarding");
  }

  return tenant;
});

export const requireAuth = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});
