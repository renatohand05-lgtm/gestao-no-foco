/**
 * Sprint 30.7 — Auth da página Automações.
 */

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createRbacSupabaseAdapter,
} from "@/lib/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import { hasAutomationPermission } from "./guards.ts";
import { resolveAnalyticsEffectivePermissions } from "@/lib/analytics/rbac-compat";

export async function requireAutomacoesAccess(tenantSlug: string) {
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

  const membershipIsOwner =
    tenant.role === "owner" ||
    tenant.role === "admin" ||
    effective.roles.includes("proprietario") ||
    effective.roles.includes("diretor");

  const allowed =
    membershipIsOwner ||
    hasAutomationPermission(effective.permissions, "automacoes.visualizar");

  if (!allowed) {
    throw new Error("Sem permissão: automacoes.visualizar");
  }

  return {
    tenant,
    profile,
    client,
    permissions: effective.permissions,
    roles: effective.roles,
  };
}
