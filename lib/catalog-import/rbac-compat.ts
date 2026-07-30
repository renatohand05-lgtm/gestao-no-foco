/**
 * Sprint 25.4.1 — Compatibilidade RBAC da Central de Importação.
 *
 * Bridge controlada entre:
 * - snapshot Enterprise (`tenant_user_roles` / tenant_rbac_role_permissions)
 * - papel legado em `tenant_members.role`
 * - catálogo canónico `ROLE_PERMISSIONS`
 *
 * Não concede acesso cross-tenant. Não inventa papéis operacionais
 * a partir de `member`/`manager` sem snapshot Enterprise.
 */

import type { TenantRole } from "../constants.ts";
import { getPermissionsForRoles } from "../rbac/role-permissions.ts";

/** Membership legado → papéis Enterprise do catálogo. */
export const MEMBERSHIP_TO_ENTERPRISE_ROLES: Readonly<
  Record<TenantRole, readonly string[]>
> = {
  owner: ["proprietario"],
  admin: ["diretor"],
  /** manager/member: só herdam via snapshot Enterprise (não over-grant). */
  manager: [],
  member: ["visualizacao"],
};

/**
 * Permissões novas de importação implicadas por equivalentes legados
 * já seedados na base (ex.: produtos.criar sem produtos.importar).
 */
const IMPLIED_BY_LEGACY: Readonly<Record<string, readonly string[]>> = {
  "produtos.importar": ["produtos.criar"],
  "servicos.importar": ["produtos.criar"],
  "estoque.importar": ["estoque.criar", "produtos.criar"],
  "compras.receber": ["compras.criar"],
};

const IMPORT_MODULE_PREFIXES = [
  "produtos.",
  "servicos.",
  "estoque.",
  "compras.",
  "fornecedores.",
  "importacoes.",
] as const;

export function mapMembershipRoleToEnterpriseRoles(
  membershipRole: string | null | undefined,
): string[] {
  if (!membershipRole?.trim()) return [];
  const key = membershipRole.trim() as TenantRole;
  return [...(MEMBERSHIP_TO_ENTERPRISE_ROLES[key] ?? [])];
}

export function isCatalogImportPermissionKey(permission: string): boolean {
  return (
    IMPORT_MODULE_PREFIXES.some((p) => permission.startsWith(p)) ||
    permission === "financeiro.criar"
  );
}

/**
 * Expande permissões legadas para as chaves granulares de importação
 * sem remover restrições existentes.
 */
export function expandCatalogImportPermissions(
  permissions: readonly string[],
): string[] {
  const set = new Set(permissions);
  for (const [granular, legacy] of Object.entries(IMPLIED_BY_LEGACY)) {
    if (set.has(granular)) continue;
    if (legacy.some((p) => set.has(p))) set.add(granular);
  }
  return [...set].sort();
}

/**
 * Verifica se o utilizador possui a permissão pedida ou um equivalente legado.
 */
export function catalogImportPermissionSatisfied(
  permissions: readonly string[],
  required: string | readonly string[],
): boolean {
  const need = Array.isArray(required) ? required : [required];
  const set = new Set(permissions);
  return need.some((p) => {
    if (set.has(p)) return true;
    const impliedBy = IMPLIED_BY_LEGACY[p];
    return impliedBy?.some((legacy) => set.has(legacy)) ?? false;
  });
}

export type CatalogImportEffectiveAuth = {
  roles: string[];
  permissions: string[];
  source: "snapshot" | "compat" | "merged";
};

/**
 * Resolve permissões efetivas para Server Actions de catálogo/estoque/NF-e.
 */
export function resolveCatalogImportEffectivePermissions(input: {
  membershipRole?: string | null;
  snapshotRoles?: readonly string[] | null;
  snapshotPermissions?: readonly string[] | null;
}): CatalogImportEffectiveAuth {
  const snapshotRoles = [...new Set(input.snapshotRoles ?? [])].filter(Boolean);
  const snapshotPermissions = [
    ...new Set(input.snapshotPermissions ?? []),
  ].filter(Boolean);
  const membershipRoles = mapMembershipRoleToEnterpriseRoles(
    input.membershipRole,
  );

  const roles = [...new Set([...snapshotRoles, ...membershipRoles])];
  const permissions = new Set(snapshotPermissions);

  const snapshotHasImport = snapshotPermissions.some(
    isCatalogImportPermissionKey,
  );

  // Catálogo vazio ou sem chaves de importação: completar a partir dos papéis.
  if ((!snapshotHasImport || snapshotPermissions.length === 0) && roles.length > 0) {
    for (const p of getPermissionsForRoles(roles)) {
      if (snapshotPermissions.length === 0) {
        permissions.add(p);
      } else if (isCatalogImportPermissionKey(p)) {
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
      if (isCatalogImportPermissionKey(p)) permissions.add(p);
    }
  }

  const expanded = expandCatalogImportPermissions([...permissions]);
  const source: CatalogImportEffectiveAuth["source"] =
    snapshotPermissions.length === 0 && roles.length > 0
      ? "compat"
      : snapshotPermissions.length > 0 &&
          (membershipRoles.length > 0 || !snapshotHasImport)
        ? "merged"
        : "snapshot";

  return { roles, permissions: expanded, source };
}
