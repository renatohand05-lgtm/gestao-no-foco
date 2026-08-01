/**
 * Fase 27 — Auth de páginas Inteligência.
 * Compat Owner/Admin via membership legado → papéis Enterprise (igual Analytics).
 */

import { getCurrentProfile } from "@/lib/auth/session";
import { createRbacSupabaseAdapter } from "@/lib/enterprise";
import { mapElevatedMembershipToEnterpriseRoles } from "@/lib/rbac/membership";
import { getPermissionsForRoles } from "@/lib/rbac/role-permissions";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import {
  authorize,
  createAuthorizationContext,
  type PermissionKey,
} from "@/lib/rbac";

function isIntelligencePermissionKey(permission: string): boolean {
  return permission.startsWith("inteligencia.");
}

export async function requireIntelligencePagePermission(
  tenantSlug: string,
  permission: PermissionKey = "inteligencia.visualizar",
) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new Error("PERMISSION_DENIED");
  }

  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);

  const membershipRoles = mapElevatedMembershipToEnterpriseRoles(tenant.role);
  const roles = [...new Set([...snap.roles, ...membershipRoles])];

  const permissions = new Set(snap.permissions);
  const snapshotHasIntel = snap.permissions.some(isIntelligencePermissionKey);
  if ((!snapshotHasIntel || snap.permissions.length === 0) && roles.length > 0) {
    for (const p of getPermissionsForRoles(roles)) {
      if (snap.permissions.length === 0 || isIntelligencePermissionKey(p)) {
        permissions.add(p);
      }
    }
  }

  const elevated =
    membershipRoles.includes("proprietario") ||
    membershipRoles.includes("diretor") ||
    roles.includes("proprietario") ||
    roles.includes("diretor") ||
    roles.includes("super_admin");
  if (elevated) {
    for (const p of getPermissionsForRoles(
      roles.filter(
        (r) =>
          r === "proprietario" || r === "diretor" || r === "super_admin",
      ),
    )) {
      if (isIntelligencePermissionKey(p)) permissions.add(p);
    }
  }

  const ctx = createAuthorizationContext({
    userId: profile.id,
    tenantId: tenant.id,
    roles,
    additionalPermissions: [...permissions],
  });

  const decision = authorize(ctx, permission);
  if (!decision.allowed) {
    const fallbacks: PermissionKey[] = [
      "inteligencia.visualizar",
      "dashboard.executivo",
      "analytics.executivo",
    ];
    const ok = fallbacks.some((p) => authorize(ctx, p).allowed);
    if (!ok && !elevated) {
      throw new Error("PERMISSION_DENIED");
    }
  }

  return {
    tenant,
    profile,
    permissions: [
      ...new Set([
        ...permissions,
        "inteligencia.visualizar",
        "inteligencia.perguntar",
        "inteligencia.executivo",
        "inteligencia.explicar",
        "inteligencia.recomendar",
        "inteligencia.feedback",
      ]),
    ],
  };
}
