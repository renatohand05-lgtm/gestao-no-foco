/**
 * Sprint 22.2 RC1 — Compatibilidade RBAC financeiro.
 *
 * Bridge controlada entre:
 * - snapshot Enterprise (`tenant_user_roles` / role_permissions)
 * - papel legado em `tenant_members.role`
 * - catálogo canónico `ROLE_PERMISSIONS`
 *
 * Não concede acesso cross-tenant nem fallback global irrestrito.
 */

import type { TenantRole } from "../../constants.ts";
import { ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES } from "../../rbac/membership.ts";
import { getPermissionsForRoles } from "../../rbac/role-permissions.ts";
import { FINANCE_ERROR_CODES, FinanceError } from "./errors.ts";

/** Papel de membership legado → papéis Enterprise do catálogo. */
export const MEMBERSHIP_TO_ENTERPRISE_ROLES: Readonly<
  Record<TenantRole, readonly string[]>
> = {
  owner: ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES.owner,
  admin: ELEVATED_MEMBERSHIP_TO_ENTERPRISE_ROLES.admin,
  manager: ["financeiro"],
  member: ["visualizacao"],
};

/** Permissões granulares 22.2 implicadas por equivalentes anteriores. */
const IMPLIED_BY_LEGACY: Readonly<Record<string, readonly string[]>> = {
  /** Analytics/Dashboard financeiro (Enterprise) → módulo financeiro canónico. */
  "financeiro.visualizar": [
    "dashboard.financeiro",
    "analytics.financeiro",
  ],
  "financeiro.ver_saldos": [
    "dashboard.financeiro",
    "analytics.financeiro",
    "financeiro.visualizar",
  ],
  "financeiro.ver_fluxo_caixa": [
    "dashboard.financeiro",
    "analytics.financeiro",
    "financeiro.visualizar",
  ],
  "financeiro.ver_dre": [
    "dashboard.financeiro",
    "analytics.financeiro",
    "financeiro.visualizar",
  ],
  "financeiro.contas.visualizar": [
    "financeiro.visualizar",
    "financeiro.ver_saldos",
    "dashboard.financeiro",
    "analytics.financeiro",
  ],
  "financeiro.movimentacoes.visualizar": [
    "financeiro.visualizar",
    "financeiro.ver_fluxo_caixa",
  ],
  "financeiro.alertas.visualizar": [
    "financeiro.visualizar",
    "financeiro.ver_saldos",
  ],
  "financeiro.tributos.visualizar": [
    "financeiro.visualizar",
    "financeiro.ver_dre",
    "dashboard.financeiro",
    "analytics.financeiro",
  ],
  "financeiro.tributos.simular": [
    "financeiro.criar",
    "financeiro.tributos.visualizar",
  ],
  "financeiro.tributos.configurar": [
    "financeiro.aprovar",
  ],
  "financeiro.cfo.visualizar": [
    "financeiro.visualizar",
    "financeiro.ver_saldos",
    "dashboard.financeiro",
    "analytics.financeiro",
  ],
  "financeiro.aging.visualizar": [
    "financeiro.visualizar",
  ],
  "financeiro.orcamento.visualizar": [
    "financeiro.visualizar",
    "financeiro.ver_dre",
  ],
  "financeiro.orcamento.criar": [
    "financeiro.criar",
    "financeiro.orcamento.visualizar",
  ],
  "financeiro.orcamento.editar": [
    "financeiro.editar",
    "financeiro.orcamento.criar",
  ],
  "financeiro.orcamento.aprovar": [
    "financeiro.aprovar",
  ],
};

export function mapMembershipRoleToEnterpriseRoles(
  membershipRole: string | null | undefined,
): string[] {
  if (!membershipRole?.trim()) return [];
  const key = membershipRole.trim() as TenantRole;
  return [...(MEMBERSHIP_TO_ENTERPRISE_ROLES[key] ?? [])];
}

export function hasFinancePermissionKey(permission: string): boolean {
  return (
    permission.startsWith("financeiro.") ||
    permission === "dashboard.financeiro" ||
    permission === "analytics.financeiro"
  );
}

/**
 * Expande permissões legadas para as chaves granulares 22.2
 * sem remover restrições existentes.
 */
export function expandFinancePermissions(
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
export function financePermissionSatisfied(
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

export type FinanceEffectiveAuth = {
  roles: string[];
  permissions: string[];
  /** snapshot = só DB; compat = catálogo membership/roles; merged = ambos */
  source: "snapshot" | "compat" | "merged";
};

/**
 * Resolve permissões efetivas para Server Actions financeiras.
 */
export function resolveFinanceEffectivePermissions(input: {
  membershipRole?: string | null;
  snapshotRoles?: readonly string[] | null;
  snapshotPermissions?: readonly string[] | null;
}): FinanceEffectiveAuth {
  const snapshotRoles = [...new Set(input.snapshotRoles ?? [])].filter(Boolean);
  const snapshotPermissions = [
    ...new Set(input.snapshotPermissions ?? []),
  ].filter(Boolean);
  const membershipRoles = mapMembershipRoleToEnterpriseRoles(
    input.membershipRole,
  );

  const roles = [...new Set([...snapshotRoles, ...membershipRoles])];
  const permissions = new Set(snapshotPermissions);

  const snapshotHasFinance = snapshotPermissions.some(hasFinancePermissionKey);

  // Catálogo vazio ou sem chaves financeiras: completar a partir dos papéis conhecidos.
  if (!snapshotHasFinance && roles.length > 0) {
    for (const p of getPermissionsForRoles(roles)) {
      if (hasFinancePermissionKey(p) || snapshotPermissions.length === 0) {
        // Se o snapshot está totalmente vazio, herda o catálogo do papel (scoped ao tenant via membership).
        if (snapshotPermissions.length === 0) {
          permissions.add(p);
        } else if (hasFinancePermissionKey(p)) {
          permissions.add(p);
        }
      }
    }
  }

  const expanded = expandFinancePermissions([...permissions]);
  const source: FinanceEffectiveAuth["source"] =
    snapshotPermissions.length === 0 && roles.length > 0
      ? "compat"
      : snapshotPermissions.length > 0 &&
          (membershipRoles.length > 0 || !snapshotHasFinance)
        ? "merged"
        : "snapshot";

  return { roles, permissions: expanded, source };
}

export function assertFinanceAccess(permissions: readonly string[]) {
  if (!permissions.some(hasFinancePermissionKey)) {
    throw new FinanceError(
      "Sem permissão para o módulo financeiro.",
      FINANCE_ERROR_CODES.PERMISSION_DENIED,
    );
  }
}
