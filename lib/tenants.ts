import { cache } from "react";
import { redirect } from "next/navigation";

import type { TenantRole } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Tenant, TenantWithRole } from "@/types";

export const getUserTenants = cache(async (): Promise<TenantWithRole[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("role, tenant_id")
    .eq("user_id", user.id);

  if (!memberships?.length) return [];

  const tenantIds = memberships.map((membership) => membership.tenant_id);

  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .in("id", tenantIds);

  if (!tenants) return [];

  return tenants.map((tenant) => ({
    ...(tenant as Tenant),
    role: memberships.find((membership) => membership.tenant_id === tenant.id)!
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
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    redirect("/onboarding");
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
