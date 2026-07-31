/**
 * Sprint 25.7.5 — Compatibilidade RBAC do CRM Enterprise.
 *
 * Bridge controlada entre:
 * - snapshot Enterprise (`tenant_user_roles` / tenant_rbac_role_permissions)
 * - papel legado em `tenant_members.role` (owner/admin)
 * - catálogo canónico `ROLE_PERMISSIONS`
 *
 * Não concede acesso cross-tenant. Não inventa papéis operacionais
 * a partir de `member`/`manager` sem snapshot Enterprise.
 */

import type { TenantRole } from "../constants.ts";
import { ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES } from "../rbac/membership.ts";
import { getPermissionsForRoles } from "../rbac/role-permissions.ts";

export const MEMBERSHIP_TO_ENTERPRISE_ROLES: Readonly<
  Record<TenantRole, readonly string[]>
> = {
  owner: ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES.owner,
  admin: ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES.admin,
  manager: [],
  member: [],
};

const CRM_VIEW_KEYS = [
  "crm.visualizar",
  "crm.criar",
  "crm.editar",
  "clientes.visualizar",
] as const;

const IMPLIED_BY_LEGACY: Readonly<Record<string, readonly string[]>> = {
  "crm.visualizar": ["clientes.visualizar", "crm.editar", "crm.criar"],
  "crm.pipeline.visualizar": ["crm.visualizar", "crm.editar"],
  "crm.pipeline.configurar": ["crm.editar"],
  "clientes.visualizar": ["crm.visualizar"],
  "clientes.editar": ["crm.editar"],
};

export function mapMembershipRoleToEnterpriseRoles(
  membershipRole: string | null | undefined,
): string[] {
  if (!membershipRole?.trim()) return [];
  const key = membershipRole.trim() as TenantRole;
  return [...(MEMBERSHIP_TO_ENTERPRISE_ROLES[key] ?? [])];
}

export function isCrmPermissionKey(permission: string): boolean {
  return (
    permission.startsWith("crm.") ||
    permission.startsWith("clientes.") ||
    permission === "dashboard.comercial"
  );
}

export function expandCrmPermissions(
  permissions: readonly string[],
): string[] {
  const set = new Set(permissions);
  for (const [granular, legacy] of Object.entries(IMPLIED_BY_LEGACY)) {
    if (set.has(granular)) continue;
    if (legacy.some((p) => set.has(p))) set.add(granular);
  }
  return [...set].sort();
}

export function crmPermissionSatisfied(
  permissions: readonly string[],
  required: string | readonly string[],
): boolean {
  const need = Array.isArray(required) ? required : [required];
  const expanded = expandCrmPermissions(permissions);
  const set = new Set(expanded);
  return need.some((p) => {
    if (set.has(p)) return true;
    const impliedBy = IMPLIED_BY_LEGACY[p];
    return impliedBy?.some((legacy) => set.has(legacy)) ?? false;
  });
}

export function hasCrmViewAccess(permissions: readonly string[]): boolean {
  return CRM_VIEW_KEYS.some((k) => crmPermissionSatisfied(permissions, k));
}

export type CrmEffectiveAuth = {
  roles: string[];
  permissions: string[];
  source: "snapshot" | "compat" | "merged";
};

export function resolveCrmEffectivePermissions(input: {
  membershipRole?: string | null;
  snapshotRoles?: readonly string[] | null;
  snapshotPermissions?: readonly string[] | null;
}): CrmEffectiveAuth {
  const snapshotRoles = [...new Set(input.snapshotRoles ?? [])].filter(Boolean);
  const snapshotPermissions = [
    ...new Set(input.snapshotPermissions ?? []),
  ].filter(Boolean);
  const membershipRoles = mapMembershipRoleToEnterpriseRoles(
    input.membershipRole,
  );
  const roles = [...new Set([...snapshotRoles, ...membershipRoles])];
  const permissions = new Set(snapshotPermissions);
  const snapshotHasCrm = snapshotPermissions.some(isCrmPermissionKey);

  if ((!snapshotHasCrm || snapshotPermissions.length === 0) && roles.length > 0) {
    for (const p of getPermissionsForRoles(roles)) {
      if (snapshotPermissions.length === 0) {
        permissions.add(p);
      } else if (isCrmPermissionKey(p)) {
        permissions.add(p);
      }
    }
  }

  const elevated =
    membershipRoles.includes("proprietario") ||
    membershipRoles.includes("diretor") ||
    roles.includes("proprietario") ||
    roles.includes("diretor");
  if (elevated) {
    for (const p of getPermissionsForRoles(
      roles.filter(
        (r) => r === "proprietario" || r === "diretor" || r === "super_admin",
      ),
    )) {
      if (isCrmPermissionKey(p)) permissions.add(p);
    }
  }

  const expanded = expandCrmPermissions([...permissions]);
  const source: CrmEffectiveAuth["source"] =
    snapshotPermissions.length === 0 && roles.length > 0
      ? "compat"
      : snapshotPermissions.length > 0 &&
          (membershipRoles.length > 0 || !snapshotHasCrm)
        ? "merged"
        : "snapshot";

  return { roles, permissions: expanded, source };
}
