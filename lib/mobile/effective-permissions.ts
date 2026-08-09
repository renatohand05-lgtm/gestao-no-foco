/**
 * Sprint 31.11.10 — Permissões efetivas mobile = mesmas bridges da Web.
 * Função pura (sem Supabase) para testes Node e resolver async.
 */

import { resolveAnalyticsEffectivePermissions } from "../analytics/rbac-compat.ts";
import type { TenantRole } from "../constants.ts";
import { resolveCrmEffectivePermissions } from "../crm/rbac-compat.ts";
import { resolveFinanceEffectivePermissions } from "../finance/shared/rbac-compat.ts";
import { expandExecutivePermissionAliases } from "../rbac/executive-access.ts";
import { resolveSupplyEffectivePermissions } from "../supply/rbac-compat.ts";

export type MobileEffectivePermissionsInput = {
  membershipRole: TenantRole;
  snapshotRoles?: readonly string[] | null;
  snapshotPermissions?: readonly string[] | null;
  /** Catálogo oficina (`PermissionService` / `tenant_role_permissions`). */
  legacyPermissions?: readonly string[] | null;
};

export type MobileEffectivePermissions = {
  permissions: string[];
  roles: string[];
  source: "snapshot" | "legacy" | "merged";
};

/**
 * Une snapshot Enterprise + catálogo oficina + bridges de domínio Web
 * (analytics / finance / CRM / supply), sem inventar privilégios além
 * das regras já usadas na Web.
 */
export function mergeMobileEffectivePermissions(
  input: MobileEffectivePermissionsInput,
): MobileEffectivePermissions {
  const snapshotRoles = [...new Set(input.snapshotRoles ?? [])].filter(Boolean);
  const snapshotPermissions = [
    ...new Set(input.snapshotPermissions ?? []),
  ].filter(Boolean);
  const legacyPermissions = [
    ...new Set(input.legacyPermissions ?? []),
  ].filter(Boolean);

  const basePermissions = [
    ...new Set([...snapshotPermissions, ...legacyPermissions]),
  ];

  const authInput = {
    membershipRole: input.membershipRole,
    snapshotRoles,
    snapshotPermissions: basePermissions,
  };

  const analytics = resolveAnalyticsEffectivePermissions(authInput);
  const finance = resolveFinanceEffectivePermissions(authInput);
  const crm = resolveCrmEffectivePermissions(authInput);
  const supply = resolveSupplyEffectivePermissions(authInput);

  const permissions = expandExecutivePermissionAliases([
    ...new Set([
      ...basePermissions,
      ...analytics.permissions,
      ...finance.permissions,
      ...crm.permissions,
      ...supply.permissions,
    ]),
  ]);

  const roles = [
    ...new Set([
      ...snapshotRoles,
      ...analytics.roles,
      ...finance.roles,
      ...crm.roles,
      ...supply.roles,
    ]),
  ];

  const bridged =
    analytics.source !== "snapshot" ||
    finance.source !== "snapshot" ||
    crm.source !== "snapshot" ||
    supply.source !== "snapshot";

  let source: MobileEffectivePermissions["source"] = "snapshot";
  if (legacyPermissions.length > 0 && snapshotPermissions.length === 0) {
    source = "legacy";
  }
  if (
    bridged ||
    (snapshotPermissions.length > 0 && legacyPermissions.length > 0)
  ) {
    source = "merged";
  }

  return { permissions, roles, source };
}
