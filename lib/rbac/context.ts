/**
 * Sprint 21.1 — Normalização do contexto de autorização.
 */

import type { UserAuthorizationContext } from "./types.ts";

function asStringList(
  value: unknown,
): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export type CreateAuthContextInput = {
  userId?: string | null;
  tenantId?: string | null;
  roles?: ReadonlyArray<string | null | undefined> | null;
  additionalPermissions?: ReadonlyArray<string | null | undefined> | null;
  deniedPermissions?: ReadonlyArray<string | null | undefined> | null;
  platformScope?: boolean | null;
};

/**
 * Cria contexto normalizado (dedupe · trim · deny-safe defaults).
 */
export function createAuthorizationContext(
  input: CreateAuthContextInput | null | undefined,
): UserAuthorizationContext {
  if (!input || typeof input !== "object") {
    return {
      userId: "",
      tenantId: null,
      roles: [],
      additionalPermissions: [],
      deniedPermissions: [],
      platformScope: false,
    };
  }

  const userId =
    typeof input.userId === "string" ? input.userId.trim() : "";
  const tenantRaw =
    typeof input.tenantId === "string" ? input.tenantId.trim() : "";

  return {
    userId,
    tenantId: tenantRaw || null,
    roles: asStringList(input.roles),
    additionalPermissions: asStringList(input.additionalPermissions),
    deniedPermissions: asStringList(input.deniedPermissions),
    platformScope: input.platformScope === true,
  };
}

export function isValidAuthorizationContext(
  context: UserAuthorizationContext | null | undefined,
): context is UserAuthorizationContext {
  if (!context || typeof context !== "object") return false;
  if (typeof context.userId !== "string" || !context.userId.trim()) {
    return false;
  }
  if (!Array.isArray(context.roles)) return false;
  return true;
}

export function withTenant(
  context: UserAuthorizationContext,
  tenantId: string,
): UserAuthorizationContext {
  return createAuthorizationContext({
    ...context,
    tenantId,
  });
}

export function withPlatformScope(
  context: UserAuthorizationContext,
  enabled = true,
): UserAuthorizationContext {
  return createAuthorizationContext({
    ...context,
    platformScope: enabled,
  });
}
