/**
 * Sprint 30.8 — Auth da página Integration Hub.
 */

import { getCurrentProfile } from "@/lib/auth/session";
import { createRbacSupabaseAdapter } from "@/lib/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import { resolveAnalyticsEffectivePermissions } from "@/lib/analytics/rbac-compat";
import { hasIntegrationPermission } from "./guards.ts";

export async function requireIntegracoesAccess(tenantSlug: string) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) throw new Error("Sessão ausente.");

  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const effective = resolveAnalyticsEffectivePermissions({
    membershipRole: tenant.role,
    snapshotRoles: snap.roles,
    snapshotPermissions: snap.permissions,
  });

  const elevated =
    tenant.role === "owner" ||
    tenant.role === "admin" ||
    effective.roles.includes("proprietario") ||
    effective.roles.includes("diretor");

  const allowed =
    elevated ||
    hasIntegrationPermission(effective.permissions, "integracoes.visualizar") ||
    hasIntegrationPermission(effective.permissions, "integracoes.administrar");

  if (!allowed) {
    throw new Error("Sem permissão: integracoes.visualizar");
  }

  return {
    tenant,
    profile,
    client,
    permissions: effective.permissions,
    roles: effective.roles,
  };
}
