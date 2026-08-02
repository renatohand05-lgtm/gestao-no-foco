/**
 * Sprint 30.2 — Auth de páginas do módulo Equipe.
 * Mesmo padrão de lib/finance/page-auth.ts: requireTenant + profile +
 * resolveAuthorizationSnapshot + permissão granular, com fallback de
 * membership elevado (owner/admin) — sem duplicar sistema de permissões.
 */

import { cache } from "react";

import {
  createEnterpriseContext,
  createRbacSupabaseAdapter,
} from "@/lib/enterprise";
import { getPermissionsForRoles } from "@/lib/rbac";
import { isElevatedMembershipRole, mapElevatedMembershipToEnterpriseRoles } from "@/lib/rbac/membership";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const EQUIPE_ERROR_CODES = {
  SESSION_MISSING: "EQUIPE_SESSION_MISSING",
  PERMISSION_DENIED: "EQUIPE_PERMISSION_DENIED",
} as const;

export type EquipeErrorCode =
  (typeof EQUIPE_ERROR_CODES)[keyof typeof EQUIPE_ERROR_CODES];

export class EquipeError extends Error {
  code: EquipeErrorCode;
  constructor(message: string, code: EquipeErrorCode) {
    super(message);
    this.name = "EquipeError";
    this.code = code;
  }
}

type EquipeEffectiveAuth = {
  roles: string[];
  permissions: string[];
};

function resolveEquipeEffectivePermissions(input: {
  membershipRole?: string | null;
  snapshotRoles?: readonly string[] | null;
  snapshotPermissions?: readonly string[] | null;
}): EquipeEffectiveAuth {
  const snapshotRoles = [...new Set(input.snapshotRoles ?? [])].filter(Boolean);
  const snapshotPermissions = [
    ...new Set(input.snapshotPermissions ?? []),
  ].filter(Boolean);
  const membershipRoles = mapElevatedMembershipToEnterpriseRoles(
    input.membershipRole,
  );

  const roles = [...new Set([...snapshotRoles, ...membershipRoles])];
  const permissions = new Set(snapshotPermissions);

  if (snapshotPermissions.length === 0 && roles.length > 0) {
    for (const p of getPermissionsForRoles(roles)) permissions.add(p);
  }

  return { roles, permissions: [...permissions].sort() };
}

/** Sessão + tenant + permissões efetivas para o módulo Equipe. */
export const resolveEquipePageAuth = cache(async (tenantSlug: string) => {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new EquipeError("Sessão ausente.", EQUIPE_ERROR_CODES.SESSION_MISSING);
  }

  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const effective = resolveEquipeEffectivePermissions({
    membershipRole: tenant.role,
    snapshotRoles: snap.roles,
    snapshotPermissions: snap.permissions,
  });

  const isElevated = isElevatedMembershipRole(tenant.role);
  const hasViewPermission = effective.permissions.includes("usuarios.visualizar");

  if (!isElevated && !hasViewPermission) {
    throw new EquipeError(
      "Sem permissão para visualizar a Equipe (usuarios.visualizar).",
      EQUIPE_ERROR_CODES.PERMISSION_DENIED,
    );
  }

  const isAdmin = tenant.role === "owner" || tenant.role === "admin";

  const context = createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    roles: effective.roles,
    permissions: effective.permissions,
    source: "server_action",
    metadata: {
      equipeAuthSource: isElevated ? "membership" : "permission",
      membershipRole: tenant.role,
    },
  });

  return {
    tenant,
    profile,
    context,
    isAdmin,
    permissions: effective.permissions,
    client,
  };
});

export type EquipePageAuth = Awaited<ReturnType<typeof resolveEquipePageAuth>>;

export async function requireEquipePageAuth(tenantSlug: string) {
  return resolveEquipePageAuth(tenantSlug);
}

/** Ações restritas a Owner/Admin (convites, cargos, equipes, mudança de papel). */
export function assertEquipeAdmin(auth: Pick<EquipePageAuth, "isAdmin">) {
  if (!auth.isAdmin) {
    throw new EquipeError(
      "Ação restrita a Owner/Admin do tenant.",
      EQUIPE_ERROR_CODES.PERMISSION_DENIED,
    );
  }
}

export function equipePageAuthError(error: unknown): {
  message: string;
  code?: string;
} {
  if (error instanceof EquipeError) {
    return { message: error.message, code: error.code };
  }
  if (error instanceof Error) return { message: error.message };
  return { message: "Erro de autorização da Equipe." };
}

export async function tryRequireEquipePageAuth(tenantSlug: string) {
  try {
    return { ok: true as const, auth: await requireEquipePageAuth(tenantSlug) };
  } catch (error) {
    return { ok: false as const, error: equipePageAuthError(error) };
  }
}
