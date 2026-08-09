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

/**
 * Aliases legados (oficina / seed) → chaves canónicas do Dashboard Executivo.
 * Espelha `lib/rbac/executive-access` sem depender do app Web.
 */
export const MOBILE_EXECUTIVE_PERMISSION_ALIASES: Readonly<
  Record<string, readonly string[]>
> = {
  "dashboard.executivo": [
    "dashboard.visualizar_executivo",
    "analytics.executivo",
  ],
  "analytics.executivo": [
    "dashboard.executivo",
    "dashboard.visualizar_executivo",
  ],
  "dashboard.visualizar": [
    "dashboard.executivo",
    "analytics.executivo",
    "dashboard.visualizar_executivo",
  ],
};

export function expandMobileExecutiveAliases(
  permissions: readonly string[],
): string[] {
  const set = new Set(permissions);
  for (const [canonical, aliases] of Object.entries(
    MOBILE_EXECUTIVE_PERMISSION_ALIASES,
  )) {
    if (set.has(canonical)) continue;
    if (aliases.some((a) => set.has(a))) set.add(canonical);
  }
  if (set.has("dashboard.executivo")) set.add("analytics.executivo");
  if (set.has("analytics.executivo")) set.add("dashboard.executivo");
  if (set.has("dashboard.visualizar_executivo")) {
    set.add("dashboard.executivo");
    set.add("analytics.executivo");
  }
  return [...set];
}

export function hasPermission(
  permissions: readonly string[],
  required: string,
): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes(required)) return true;
  const aliases = MOBILE_EXECUTIVE_PERMISSION_ALIASES[required];
  return aliases?.some((a) => permissions.includes(a)) ?? false;
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
