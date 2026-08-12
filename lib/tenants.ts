import { cache } from "react";
import { redirect } from "next/navigation";

import type { TenantRole } from "@/lib/constants";
import { logger } from "@/lib/observability/logger";
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
    // Sem membership neste slug: não abrir o tenant por URL.
    // Se o usuário já tem empresas, vai para a autorizada; senão onboarding.
    logger.warn("tenant_context_denied", {
      attemptedSlug: slug,
      userId: user.id,
      authorizedCount: tenants.length,
    });
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
