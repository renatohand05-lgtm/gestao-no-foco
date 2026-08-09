/**
 * Sprint 29.10.1 — Compat RBAC Supply/Compras.
 *
 * Bridge controlada entre snapshot Enterprise (tenant_user_roles) e
 * papel legado em tenant_members.role (owner/admin → proprietario/diretor),
 * espelhando o padrão de lib/crm/rbac-compat.ts.
 *
 * Não altera a matriz ROLE_PERMISSIONS; apenas resolve permissões efetivas
 * quando o snapshot DB não traz as keys de compras/estoque.
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

export function mapMembershipRoleToEnterpriseRoles(
  membershipRole: string | null | undefined,
): string[] {
  if (!membershipRole?.trim()) return [];
  const key = membershipRole.trim() as TenantRole;
  return [...(MEMBERSHIP_TO_ENTERPRISE_ROLES[key] ?? [])];
}

export function isSupplyPermissionKey(permission: string): boolean {
  return (
    permission.startsWith("compras.") ||
    permission.startsWith("estoque.") ||
    permission.startsWith("supply.") ||
    permission.startsWith("fornecedores.") ||
    permission === "dashboard.estoque"
  );
}

export type SupplyEffectiveAuth = {
  roles: string[];
  permissions: string[];
  source: "snapshot" | "compat" | "merged";
};

export function resolveSupplyEffectivePermissions(input: {
  membershipRole?: string | null;
  snapshotRoles?: readonly string[] | null;
  snapshotPermissions?: readonly string[] | null;
}): SupplyEffectiveAuth {
  const snapshotRoles = [...new Set(input.snapshotRoles ?? [])].filter(Boolean);
  const snapshotPermissions = [
    ...new Set(input.snapshotPermissions ?? []),
  ].filter(Boolean);
  const membershipRoles = mapMembershipRoleToEnterpriseRoles(
    input.membershipRole,
  );
  const roles = [...new Set([...snapshotRoles, ...membershipRoles])];
  const permissions = new Set(snapshotPermissions);
  const snapshotHasSupply = snapshotPermissions.some(isSupplyPermissionKey);

  if (
    (!snapshotHasSupply || snapshotPermissions.length === 0) &&
    roles.length > 0
  ) {
    for (const p of getPermissionsForRoles(roles)) {
      if (snapshotPermissions.length === 0) {
        permissions.add(p);
      } else if (isSupplyPermissionKey(p)) {
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
      if (isSupplyPermissionKey(p)) permissions.add(p);
    }
  }

  const source: SupplyEffectiveAuth["source"] =
    snapshotPermissions.length === 0 && roles.length > 0
      ? "compat"
      : snapshotPermissions.length > 0 &&
          (membershipRoles.length > 0 || !snapshotHasSupply)
        ? "merged"
        : "snapshot";

  return { roles, permissions: [...permissions].sort(), source };
}
