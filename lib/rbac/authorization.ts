/**
 * Sprint 21.1 — API central de autorização.
 *
 * Precedência:
 * 1. negação explícita
 * 2. política contextual
 * 3. permissão adicional
 * 4. permissão herdada de role
 * 5. negação por padrão (deny-by-default)
 */

import { createAbility } from "./abilities.ts";
import {
  isValidAuthorizationContext,
} from "./context.ts";
import { safeAuthMessage } from "./errors.ts";
import { isKnownPermission } from "./permissions.ts";
import { evaluatePolicies } from "./policies.ts";
import { getPermissionsForRole } from "./role-permissions.ts";
import type {
  AuthorizationDecision,
  AuthorizationReason,
  AuthorizeOptions,
  UserAuthorizationContext,
} from "./types.ts";

function decision(
  partial: Omit<AuthorizationDecision, "message"> & { message?: string },
): AuthorizationDecision {
  return {
    ...partial,
    message: partial.message ?? safeAuthMessage(partial.reason),
  };
}

function denyInvalid(
  context: UserAuthorizationContext | null | undefined,
  permission: string | null,
  reason: AuthorizationReason = "INVALID_CONTEXT",
): AuthorizationDecision {
  return decision({
    allowed: false,
    reason,
    permission,
    userId: context?.userId ?? null,
    tenantId: context?.tenantId ?? null,
  });
}

/**
 * Avalia se o usuário pode executar a permissão no tenant do contexto.
 */
export function authorize(
  context: UserAuthorizationContext | null | undefined,
  permission: string | null | undefined,
  options?: AuthorizeOptions,
): AuthorizationDecision {
  if (!isValidAuthorizationContext(context)) {
    return denyInvalid(context, permission ?? null, "INVALID_CONTEXT");
  }

  const auth = context;

  if (permission == null || typeof permission !== "string" || !permission.trim()) {
    return denyInvalid(auth, permission ?? null, "EMPTY_REQUIREMENT");
  }

  const perm = permission.trim();

  if (!isKnownPermission(perm)) {
    return decision({
      allowed: false,
      reason: "UNKNOWN_PERMISSION",
      permission: perm,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });
  }

  const ability = createAbility(auth);
  const isPlatformAdmin =
    ability.roles.includes("super_admin") && ability.platformScope;

  // 1. Negação explícita — sempre vence
  if (ability.denied.has(perm)) {
    return decision({
      allowed: false,
      reason: "EXPLICIT_DENY",
      permission: perm,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });
  }

  // 2. Políticas contextuais (tenant obrigatório + isolamento)
  const policyResult = evaluatePolicies(
    auth,
    perm,
    options,
    options?.policyIds,
  );

  if (policyResult.allowed === false) {
    const reason: AuthorizationReason =
      policyResult.policyId === "tenant_isolation"
        ? "TENANT_MISMATCH"
        : policyResult.policyId === "require_tenant"
          ? "MISSING_TENANT"
          : "POLICY_DENIED";

    return decision({
      allowed: false,
      reason,
      permission: perm,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });
  }

  // Platform admin com escopo global: acesso total após políticas de isolamento
  if (isPlatformAdmin) {
    return decision({
      allowed: true,
      reason: "ALLOWED_PLATFORM",
      permission: perm,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });
  }

  const additional = new Set(auth.additionalPermissions ?? []);
  const roleGranted = ability.granted.has(perm) && !additional.has(perm);

  // 3. Permissão adicional
  if (additional.has(perm) && ability.granted.has(perm)) {
    return decision({
      allowed: true,
      reason: "ALLOWED_ADDITIONAL",
      permission: perm,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });
  }

  // 4. Herança de role
  if (roleGranted || ability.granted.has(perm)) {
    return decision({
      allowed: true,
      reason: "ALLOWED_ROLE",
      permission: perm,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });
  }

  // 5. Deny-by-default
  return decision({
    allowed: false,
    reason: "DENY_BY_DEFAULT",
    permission: perm,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });
}

export function can(
  context: UserAuthorizationContext | null | undefined,
  permission: string | null | undefined,
  options?: AuthorizeOptions,
): boolean {
  return authorize(context, permission, options).allowed;
}

export function cannot(
  context: UserAuthorizationContext | null | undefined,
  permission: string | null | undefined,
  options?: AuthorizeOptions,
): boolean {
  return !can(context, permission, options);
}

export function explainAuthorization(
  context: UserAuthorizationContext | null | undefined,
  permission: string | null | undefined,
  options?: AuthorizeOptions,
): AuthorizationDecision {
  return authorize(context, permission, options);
}

export function hasRole(
  context: UserAuthorizationContext | null | undefined,
  role: string | null | undefined,
): boolean {
  if (!context || !role || typeof role !== "string") return false;
  return context.roles.includes(role);
}

export function hasAnyRole(
  context: UserAuthorizationContext | null | undefined,
  roles: ReadonlyArray<string> | null | undefined,
): boolean {
  if (!context || !roles || roles.length === 0) return false;
  return roles.some((r) => hasRole(context, r));
}

export function hasAllRoles(
  context: UserAuthorizationContext | null | undefined,
  roles: ReadonlyArray<string> | null | undefined,
): boolean {
  if (!context || !roles || roles.length === 0) return false;
  return roles.every((r) => hasRole(context, r));
}

export function hasAnyPermission(
  context: UserAuthorizationContext | null | undefined,
  permissions: ReadonlyArray<string> | null | undefined,
  options?: AuthorizeOptions,
): boolean {
  if (!permissions || permissions.length === 0) return false;
  return permissions.some((p) => can(context, p, options));
}

export function hasAllPermissions(
  context: UserAuthorizationContext | null | undefined,
  permissions: ReadonlyArray<string> | null | undefined,
  options?: AuthorizeOptions,
): boolean {
  if (!permissions || permissions.length === 0) return false;
  return permissions.every((p) => can(context, p, options));
}

/** Inspeciona herança bruta de um papel (sem contexto de usuário). */
export function roleGrantsPermission(
  roleId: string,
  permission: string,
): boolean {
  return getPermissionsForRole(roleId).includes(
    permission as ReturnType<typeof getPermissionsForRole>[number],
  );
}
