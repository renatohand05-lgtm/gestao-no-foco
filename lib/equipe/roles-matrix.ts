/**
 * Sprint 30.2 — Matriz de papéis × permissões, construída a partir do
 * catálogo canônico RBAC (SYSTEM_ROLES + ROLE_PERMISSIONS + ALL_PERMISSION_KEYS).
 * Sem duplicar regra de negócio — apenas apresenta o catálogo existente.
 */

import { mapElevatedMembershipToEnterpriseRoles } from "../rbac/membership.ts";
import { PERMISSIONS_BY_MODULE } from "../rbac/permissions.ts";
import { getPermissionsForRole } from "../rbac/role-permissions.ts";
import { SYSTEM_ROLES } from "../rbac/roles.ts";
import type { MembershipRole, RolesMatrix, RolesMatrixModule } from "./types.ts";

let cached: RolesMatrix | null = null;

export function buildRolesMatrix(): RolesMatrix {
  if (cached) return cached;

  const roles = SYSTEM_ROLES.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    level: role.level,
    scope: role.scope,
  }));

  const modules: RolesMatrixModule[] = Object.entries(PERMISSIONS_BY_MODULE).map(
    ([module, permissions]) => ({
      module,
      entries: permissions.map((permission) => ({
        permissionKey: permission.key,
        action: permission.action,
        description: permission.description,
        category: permission.category,
        risk: permission.risk,
        rolesGranting: SYSTEM_ROLES.filter((role) =>
          getPermissionsForRole(role.id).includes(
            permission.key as ReturnType<typeof getPermissionsForRole>[number],
          ),
        ).map((role) => role.id),
      })),
    }),
  );

  cached = { roles, modules };
  return cached;
}

/** Papel de membership legado → papéis Enterprise (mesma fonte de lib/rbac/membership). */
export function membershipRoleToEnterpriseRoles(
  role: MembershipRole,
): string[] {
  if (role === "owner" || role === "admin") {
    return mapElevatedMembershipToEnterpriseRoles(role);
  }
  if (role === "manager") return ["operacoes"];
  return ["visualizacao"];
}

export function countModulesInMatrix(matrix: RolesMatrix): number {
  return matrix.modules.length;
}

export function countPermissionsInMatrix(matrix: RolesMatrix): number {
  return matrix.modules.reduce((total, mod) => total + mod.entries.length, 0);
}

export function findRoleInMatrix(matrix: RolesMatrix, roleId: string) {
  return matrix.roles.find((role) => role.id === roleId) ?? null;
}
