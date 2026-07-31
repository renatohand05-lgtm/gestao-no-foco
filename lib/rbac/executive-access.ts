/**
 * Sprint 25.7.4 — Acesso ao Dashboard Executivo / Analytics.
 * Fonte única das chaves exigidas (sem bypass, sem permissões fictícias).
 */

import {
  createAuthorizationContext,
  type CreateAuthContextInput,
} from "./context.ts";
import { requireAnyPermission, requirePermission } from "./guards.ts";
import type {
  AuthorizeOptions,
  UserAuthorizationContext,
} from "./types.ts";

/** Any-of canónico para o Dashboard Executivo (Analytics Enterprise). */
export const EXECUTIVE_DASHBOARD_ANY_OF = [
  "analytics.executivo",
  "dashboard.executivo",
] as const;

/** Visualização geral de Analytics (áreas / drill) — não basta para o executivo. */
export const ANALYTICS_VIEW_ANY_OF = [
  "analytics.visualizar",
  "analytics.executivo",
  "dashboard.executivo",
] as const;

/** Alias legado (seed oficina / PermissionService). */
export const LEGACY_EXECUTIVE_PERMISSION_ALIASES: Readonly<
  Record<string, readonly string[]>
> = {
  "dashboard.executivo": ["dashboard.visualizar_executivo"],
  "analytics.executivo": [
    "dashboard.executivo",
    "dashboard.visualizar_executivo",
  ],
  "analytics.visualizar": [
    "analytics.executivo",
    "dashboard.executivo",
    "dashboard.visualizar_executivo",
  ],
};

export function expandExecutivePermissionAliases(
  permissions: readonly string[],
): string[] {
  const set = new Set(permissions);
  for (const [canonical, aliases] of Object.entries(
    LEGACY_EXECUTIVE_PERMISSION_ALIASES,
  )) {
    if (set.has(canonical)) continue;
    if (aliases.some((a) => set.has(a))) set.add(canonical);
  }
  // Bidirecional: dashboard.executivo ↔ analytics.executivo
  if (set.has("dashboard.executivo")) set.add("analytics.executivo");
  if (set.has("analytics.executivo")) set.add("dashboard.executivo");
  if (set.has("dashboard.visualizar_executivo")) {
    set.add("dashboard.executivo");
    set.add("analytics.executivo");
  }
  return [...set].sort();
}

export function hasExecutiveDashboardAccess(
  permissions: readonly string[],
): boolean {
  const expanded = expandExecutivePermissionAliases(permissions);
  return EXECUTIVE_DASHBOARD_ANY_OF.some((p) => expanded.includes(p));
}

export function hasAnalyticsViewAccess(
  permissions: readonly string[],
): boolean {
  const expanded = expandExecutivePermissionAliases(permissions);
  return ANALYTICS_VIEW_ANY_OF.some((p) => expanded.includes(p));
}

/**
 * Guard canónico Analytics / Dashboard Executivo.
 * Default: exige any-of executivo (não libera só com analytics.visualizar).
 */
export function requireAnalyticsPermission(
  context: UserAuthorizationContext | null | undefined,
  required:
    | string
    | readonly string[] = EXECUTIVE_DASHBOARD_ANY_OF,
  options?: AuthorizeOptions,
): true {
  const need = Array.isArray(required) ? required : [required];
  if (need.length === 1) {
    return requirePermission(context, need[0], options);
  }
  return requireAnyPermission(context, need, options);
}

/** Constrói contexto RBAC a partir de roles + permissões efetivas. */
export function buildAnalyticsAuthContext(
  input: CreateAuthContextInput & {
    permissions?: readonly string[] | null;
  },
): UserAuthorizationContext {
  const raw = input.permissions ?? input.additionalPermissions ?? [];
  const base = [...raw].filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
  const expanded = expandExecutivePermissionAliases(base);
  return createAuthorizationContext({
    userId: input.userId,
    tenantId: input.tenantId,
    roles: input.roles,
    additionalPermissions: expanded,
    deniedPermissions: input.deniedPermissions,
    platformScope: input.platformScope,
  });
}
