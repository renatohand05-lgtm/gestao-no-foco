/**
 * Sprint 26.8 — Auth de páginas Tributário.
 * Sprint 29.2 — React.cache no resolve (dedupe snapshot por request).
 */

import { cache } from "react";

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

function isTaxPermission(p: string): boolean {
  return p.startsWith("tax.") || p.startsWith("financeiro.tributos.");
}

const resolveTaxPageAuth = cache(async (tenantSlug: string) => {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) throw new Error("PERMISSION_DENIED");

  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);

  const membershipRoles = mapElevatedMembershipToEnterpriseRoles(tenant.role);
  const roles = [...new Set([...snap.roles, ...membershipRoles])];
  const permissions = new Set(snap.permissions);

  const snapshotHasTax = snap.permissions.some(isTaxPermission);
  if ((!snapshotHasTax || snap.permissions.length === 0) && roles.length > 0) {
    for (const p of getPermissionsForRoles(roles)) {
      if (snap.permissions.length === 0 || isTaxPermission(p)) {
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
      if (isTaxPermission(p)) permissions.add(p);
    }
  }

  // Compat legado financeiro.tributos.*
  if (permissions.has("financeiro.tributos.visualizar" as PermissionKey)) {
    permissions.add("tax.visualizar");
    permissions.add("tax.executivo");
  }
  if (permissions.has("financeiro.tributos.simular" as PermissionKey)) {
    permissions.add("tax.simular");
    permissions.add("tax.comparar_regimes");
  }
  if (permissions.has("financeiro.tributos.configurar" as PermissionKey)) {
    permissions.add("tax.configurar");
    permissions.add("tax.criar_regra");
    permissions.add("tax.editar_draft");
    permissions.add("tax.revisar");
    permissions.add("tax.aprovar");
    permissions.add("tax.publicar");
    permissions.add("tax.versionar");
  }

  return {
    tenant,
    profile,
    roles,
    permissions,
    elevated,
  };
});

export async function requireTaxPagePermission(
  tenantSlug: string,
  permission: PermissionKey = "tax.visualizar",
) {
  const { tenant, profile, roles, permissions, elevated } =
    await resolveTaxPageAuth(tenantSlug);

  const ctx = createAuthorizationContext({
    userId: profile.id,
    tenantId: tenant.id,
    roles,
    additionalPermissions: [...permissions],
  });

  const decision = authorize(ctx, permission);
  if (!decision.allowed) {
    const fallbacks: PermissionKey[] = [
      "tax.visualizar",
      "financeiro.tributos.visualizar",
      "financeiro.visualizar",
    ];
    const ok = fallbacks.some((p) => authorize(ctx, p).allowed);
    if (!ok && !elevated) throw new Error("PERMISSION_DENIED");
  }

  return {
    tenant,
    profile,
    permissions: [...permissions],
  };
}
