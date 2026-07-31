/**
 * Sprint 25.7.3 / 25.7.4 — Compatibilidade RBAC do Analytics / Dashboard Executivo.
 *
 * Bridge controlada entre:
 * - snapshot Enterprise (`tenant_user_roles` / tenant_rbac_role_permissions)
 * - papel legado em `tenant_members.role` (owner/admin)
 * - catálogo canónico `ROLE_PERMISSIONS`
 *
 * Owner (`owner` → `proprietario`) e Admin (`admin` → `diretor`)
 * recebem as chaves analytics/dashboard do catálogo quando o snapshot
 * Enterprise está vazio ou parcial.
 *
 * Não concede acesso cross-tenant. Não inventa papéis operacionais
 * a partir de `member`/`manager` sem snapshot Enterprise.
 */

import type { TenantRole } from "../constants.ts";
import {
  ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES,
  mapElevatedMembershipToEnterpriseRoles,
} from "../rbac/membership.ts";
import {
  expandExecutivePermissionAliases,
  hasExecutiveDashboardAccess,
} from "../rbac/executive-access.ts";
import { getPermissionsForRoles } from "../rbac/role-permissions.ts";

/** Membership legado → papéis Enterprise do catálogo. */
export const MEMBERSHIP_TO_ENTERPRISE_ROLES: Readonly<
  Record<TenantRole, readonly string[]>
> = {
  owner: ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES.owner,
  admin: ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES.admin,
  /** manager/member: só herdam via snapshot Enterprise (não over-grant). */
  manager: [],
  member: [],
};

/**
 * Permissões de Analytics / Dashboard Executivo implicadas por equivalentes.
 */
const IMPLIED_BY_LEGACY: Readonly<Record<string, readonly string[]>> = {
  "analytics.visualizar": [
    "dashboard.executivo",
    "analytics.executivo",
    "dashboard.visualizar_executivo",
  ],
  "analytics.executivo": [
    "dashboard.executivo",
    "dashboard.visualizar_executivo",
  ],
  "dashboard.executivo": [
    "analytics.executivo",
    "dashboard.visualizar_executivo",
  ],
  "analytics.exportar": ["dashboard.exportar", "relatorios.exportar"],
  "analytics.configurar": [
    "dashboard.executivo",
    "dashboard.visualizar_executivo",
  ],
};

const ANALYTICS_MODULE_PREFIXES = ["analytics.", "dashboard."] as const;

export function mapMembershipRoleToEnterpriseRoles(
  membershipRole: string | null | undefined,
): string[] {
  const elevated = mapElevatedMembershipToEnterpriseRoles(membershipRole);
  if (elevated.length > 0) return elevated;
  if (!membershipRole?.trim()) return [];
  const key = membershipRole.trim() as TenantRole;
  return [...(MEMBERSHIP_TO_ENTERPRISE_ROLES[key] ?? [])];
}

export function isAnalyticsPermissionKey(permission: string): boolean {
  return (
    ANALYTICS_MODULE_PREFIXES.some(
      (p) => permission === p.slice(0, -1) || permission.startsWith(p),
    ) || permission === "dashboard.visualizar_executivo"
  );
}

/**
 * Expande permissões legadas para chaves granulares de analytics
 * sem remover restrições existentes.
 */
export function expandAnalyticsPermissions(
  permissions: readonly string[],
): string[] {
  const set = new Set(expandExecutivePermissionAliases(permissions));
  for (const [granular, legacy] of Object.entries(IMPLIED_BY_LEGACY)) {
    if (set.has(granular)) continue;
    if (legacy.some((p) => set.has(p))) set.add(granular);
  }
  return [...set].sort();
}

/**
 * Verifica se o utilizador possui a permissão pedida ou um equivalente legado.
 */
export function analyticsRbacPermissionSatisfied(
  permissions: readonly string[],
  required: string | readonly string[],
): boolean {
  const need = Array.isArray(required) ? required : [required];
  const expanded = expandAnalyticsPermissions(permissions);
  const set = new Set(expanded);
  return need.some((p) => {
    if (set.has(p)) return true;
    const impliedBy = IMPLIED_BY_LEGACY[p];
    return impliedBy?.some((legacy) => set.has(legacy)) ?? false;
  });
}

export type AnalyticsEffectiveAuth = {
  roles: string[];
  permissions: string[];
  source: "snapshot" | "compat" | "merged";
};

/**
 * Resolve permissões efetivas para Server Actions de Analytics / Dashboard Executivo.
 */
export function resolveAnalyticsEffectivePermissions(input: {
  membershipRole?: string | null;
  snapshotRoles?: readonly string[] | null;
  snapshotPermissions?: readonly string[] | null;
}): AnalyticsEffectiveAuth {
  const snapshotRoles = [...new Set(input.snapshotRoles ?? [])].filter(Boolean);
  const snapshotPermissions = [
    ...new Set(input.snapshotPermissions ?? []),
  ].filter(Boolean);
  const membershipRoles = mapMembershipRoleToEnterpriseRoles(
    input.membershipRole,
  );

  const roles = [...new Set([...snapshotRoles, ...membershipRoles])];
  const permissions = new Set(snapshotPermissions);

  const snapshotHasAnalytics = snapshotPermissions.some(isAnalyticsPermissionKey);

  // Catálogo vazio ou sem chaves analytics: completar a partir dos papéis.
  if ((!snapshotHasAnalytics || snapshotPermissions.length === 0) && roles.length > 0) {
    for (const p of getPermissionsForRoles(roles)) {
      if (snapshotPermissions.length === 0) {
        permissions.add(p);
      } else if (isAnalyticsPermissionKey(p)) {
        permissions.add(p);
      }
    }
  }

  // Owner/Admin com snapshot parcial: garantir chaves canónicas do papel.
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
      if (isAnalyticsPermissionKey(p)) permissions.add(p);
    }
  }

  const expanded = expandAnalyticsPermissions([...permissions]);
  const source: AnalyticsEffectiveAuth["source"] =
    snapshotPermissions.length === 0 && roles.length > 0
      ? "compat"
      : snapshotPermissions.length > 0 &&
          (membershipRoles.length > 0 || !snapshotHasAnalytics)
        ? "merged"
        : "snapshot";

  return { roles, permissions: expanded, source };
}

export { hasExecutiveDashboardAccess };
