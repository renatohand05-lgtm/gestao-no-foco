/**
 * Sprint 22.1 — RBAC helpers para Finance Core.
 */

import type { FinancePermission } from "./types.ts";
import { FINANCE_ERROR_CODES, FinanceError } from "./errors.ts";

export function assertFinancePermission(
  permissions: readonly string[],
  required: FinancePermission | FinancePermission[],
) {
  const need = Array.isArray(required) ? required : [required];
  const ok = need.some((p) => permissions.includes(p));
  if (!ok) {
    throw new FinanceError(
      `Sem permissão: ${need.join(" | ")}`,
      FINANCE_ERROR_CODES.PERMISSION_DENIED,
    );
  }
}

/** Arquivar: aceita financeiro.arquivar ou financeiro.excluir (legado). */
export function assertArchivePermission(permissions: readonly string[]) {
  assertFinancePermission(permissions, [
    "financeiro.arquivar",
    "financeiro.excluir",
  ]);
}
