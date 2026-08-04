/**
 * @gof/rbac-contracts — helpers RBAC portáveis (Sprint 31.0).
 * Catálogo completo permanece em lib/rbac (web). Mobile usa contratos.
 */

export type PermissionKey = string;

/** Permissões relevantes ao shell mobile + dashboard executivo. */
export const MOBILE_SHELL_PERMISSIONS = [
  "dashboard.visualizar",
  "dashboard.executivo",
  "analytics.executivo",
  "crm.visualizar",
  "ordens.visualizar",
  "estoque.visualizar",
  "financeiro.visualizar",
  "integracoes.visualizar",
] as const;

export const MOBILE_EXECUTIVE_DASHBOARD_ANY_OF = [
  "dashboard.executivo",
  "analytics.executivo",
  "dashboard.visualizar",
] as const;

export function hasPermission(
  permissions: readonly string[],
  required: string,
): boolean {
  if (permissions.includes("*")) return true;
  return permissions.includes(required);
}

export function hasAnyPermission(
  permissions: readonly string[],
  required: readonly string[],
): boolean {
  return required.some((p) => hasPermission(permissions, p));
}

export function hasAllPermissions(
  permissions: readonly string[],
  required: readonly string[],
): boolean {
  return required.every((p) => hasPermission(permissions, p));
}
