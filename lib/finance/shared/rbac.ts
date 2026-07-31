/**
 * Sprint 22.1 / 22.2 RC1 — RBAC helpers para Finance Core.
 */

import type { FinancePermission } from "./types.ts";
import { FINANCE_ERROR_CODES, FinanceError } from "./errors.ts";
import { financePermissionSatisfied } from "./rbac-compat.ts";

export function assertFinancePermission(
  permissions: readonly string[],
  required: FinancePermission | FinancePermission[],
) {
  const need = Array.isArray(required) ? required : [required];
  if (!financePermissionSatisfied(permissions, need)) {
    throw new FinanceError(
      `Sem permissão: ${need.join(" | ")}`,
      FINANCE_ERROR_CODES.PERMISSION_DENIED,
    );
  }
}

/** Alias canónico (Sprint 25.7.4) — mesma regra que assertFinancePermission. */
export function requireFinancePermission(
  permissions: readonly string[],
  required: FinancePermission | FinancePermission[],
) {
  assertFinancePermission(permissions, required);
}

/** Arquivar: aceita financeiro.arquivar ou financeiro.excluir (legado). */
export function assertArchivePermission(permissions: readonly string[]) {
  assertFinancePermission(permissions, [
    "financeiro.arquivar",
    "financeiro.excluir",
  ]);
}

export {
  resolveFinanceEffectivePermissions,
  expandFinancePermissions,
  mapMembershipRoleToEnterpriseRoles,
  assertFinanceAccess,
  financePermissionSatisfied,
  hasFinancePermissionKey,
  MEMBERSHIP_TO_ENTERPRISE_ROLES,
} from "./rbac-compat.ts";
