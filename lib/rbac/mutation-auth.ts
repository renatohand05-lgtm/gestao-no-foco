/**
 * Sprint 34.3 — Auth de mutações server-side (fail-closed).
 * AUTH + membership ativa (requireTenant 34.2) + permission do catálogo existente.
 */
import "server-only";

import { getCurrentProfile } from "@/lib/auth/session";
import { createRbacSupabaseAdapter } from "@/lib/enterprise";
import {
  authorize,
  createAuthorizationContext,
  type PermissionKey,
} from "@/lib/rbac";
import { AccessDeniedError } from "@/lib/rbac/errors";
import { mapElevatedMembershipToEnterpriseRoles } from "@/lib/rbac/membership";
import { getPermissionsForRoles } from "@/lib/rbac/role-permissions";
import { createClient } from "@/lib/supabase/server";
import { getUserTenants, requireTenant } from "@/lib/tenants";
import type { TenantWithRole } from "@/types";

export class MutationAuthError extends Error {
  code = "MUTATION_PERMISSION_DENIED" as const;
  constructor(message = "Sem permissão para esta operação.") {
    super(message);
    this.name = "MutationAuthError";
  }
}

async function resolveMutationPermissions(
  tenant: TenantWithRole,
  userId: string,
): Promise<{ roles: string[]; permissions: string[] }> {
  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, userId);
  const membershipRoles = mapElevatedMembershipToEnterpriseRoles(tenant.role);
  const roles = [...new Set([...snap.roles, ...membershipRoles])];
  const permissions = new Set(snap.permissions);

  if (permissions.size === 0 && roles.length > 0) {
    for (const p of getPermissionsForRoles(roles)) permissions.add(p);
  } else if (membershipRoles.length > 0) {
    // Owner/admin: garantir catálogo elevado mesmo com snapshot parcial
    for (const p of getPermissionsForRoles(membershipRoles)) {
      permissions.add(p);
    }
  }

  return { roles, permissions: [...permissions] };
}

/**
 * Mutação por slug de tenant (caminho preferido).
 * requireTenant já bloqueia inactive / cross-tenant / unauthenticated redirect.
 */
export async function requireTenantMutationPermission(
  tenantSlug: string,
  required: PermissionKey | readonly PermissionKey[],
): Promise<{ tenant: TenantWithRole; userId: string; permissions: string[] }> {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new MutationAuthError("Sessão ausente.");
  }

  const effective = await resolveMutationPermissions(tenant, profile.id);
  const need = (Array.isArray(required) ? required : [required]) as PermissionKey[];
  const ctx = createAuthorizationContext({
    userId: profile.id,
    tenantId: tenant.id,
    roles: effective.roles,
    additionalPermissions: effective.permissions,
  });

  const allowed = need.some((p) => authorize(ctx, p).allowed);
  if (!allowed) {
    throw new MutationAuthError(
      `Sem permissão (${need.join(" | ")}) para esta operação.`,
    );
  }

  return {
    tenant,
    userId: profile.id,
    permissions: effective.permissions,
  };
}

/**
 * Domínios que ainda passam tenantId (ex.: tax).
 * Valida que o UUID pertence a uma membership ATIVA do usuário atual.
 */
export async function requireActiveTenantIdMutation(
  tenantId: string,
  required: PermissionKey | readonly PermissionKey[],
): Promise<{ tenant: TenantWithRole; userId: string }> {
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new MutationAuthError("Sessão ausente.");
  }

  const tenants = await getUserTenants();
  const tenant = tenants.find((t) => t.id === tenantId) ?? null;
  if (!tenant) {
    throw new MutationAuthError("Tenant inválido ou sem acesso ativo.");
  }

  // Reusa o caminho por slug (double-check + permissions)
  return requireTenantMutationPermission(tenant.slug, required);
}

export function isMutationAuthError(error: unknown): error is MutationAuthError {
  return (
    error instanceof MutationAuthError ||
    error instanceof AccessDeniedError ||
    (error instanceof Error &&
      (error.message === "PERMISSION_DENIED" ||
        error.name === "MutationAuthError"))
  );
}
