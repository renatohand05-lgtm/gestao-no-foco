/**
 * Sprint 21.1 — Guards para proteger ações (Server Actions, jobs, etc.).
 */

import {
  authorize,
  can,
  hasAllPermissions,
  hasAllRoles,
  hasAnyPermission,
  hasAnyRole,
  hasRole,
} from "./authorization.ts";
import { AccessDeniedError, AuthorizationError, AUTH_ERROR_CODES } from "./errors.ts";
import type {
  AuthorizationDecision,
  AuthorizeOptions,
  UserAuthorizationContext,
} from "./types.ts";

export function assertPermission(
  context: UserAuthorizationContext | null | undefined,
  permission: string,
  options?: AuthorizeOptions,
): AuthorizationDecision {
  const result = authorize(context, permission, options);
  if (!result.allowed) {
    throw new AccessDeniedError(result);
  }
  return result;
}

export function requirePermission(
  context: UserAuthorizationContext | null | undefined,
  permission: string,
  options?: AuthorizeOptions,
): true {
  assertPermission(context, permission, options);
  return true;
}

export function requireAnyPermission(
  context: UserAuthorizationContext | null | undefined,
  permissions: ReadonlyArray<string>,
  options?: AuthorizeOptions,
): true {
  if (!permissions.length) {
    throw new AuthorizationError("Requisito de permissão vazio.", {
      code: AUTH_ERROR_CODES.AUTHORIZATION_FAILED,
      reason: "EMPTY_REQUIREMENT",
    });
  }
  if (!hasAnyPermission(context, permissions, options)) {
    const decision = authorize(context, permissions[0], options);
    throw new AccessDeniedError({
      ...decision,
      allowed: false,
      reason: decision.allowed ? "DENY_BY_DEFAULT" : decision.reason,
      permission: permissions.join("|"),
    });
  }
  return true;
}

export function requireAllPermissions(
  context: UserAuthorizationContext | null | undefined,
  permissions: ReadonlyArray<string>,
  options?: AuthorizeOptions,
): true {
  if (!permissions.length) {
    throw new AuthorizationError("Requisito de permissão vazio.", {
      code: AUTH_ERROR_CODES.AUTHORIZATION_FAILED,
      reason: "EMPTY_REQUIREMENT",
    });
  }
  for (const permission of permissions) {
    assertPermission(context, permission, options);
  }
  return true;
}

export function requireRole(
  context: UserAuthorizationContext | null | undefined,
  role: string,
): true {
  if (!hasRole(context, role)) {
    throw new AccessDeniedError({
      allowed: false,
      reason: "ROLE_REQUIRED",
      permission: null,
      userId: context?.userId ?? null,
      tenantId: context?.tenantId ?? null,
      message: "Papel insuficiente para esta ação.",
    });
  }
  return true;
}

export function requireAnyRole(
  context: UserAuthorizationContext | null | undefined,
  roles: ReadonlyArray<string>,
): true {
  if (!roles.length || !hasAnyRole(context, roles)) {
    throw new AccessDeniedError({
      allowed: false,
      reason: roles.length ? "ROLE_REQUIRED" : "EMPTY_REQUIREMENT",
      permission: null,
      userId: context?.userId ?? null,
      tenantId: context?.tenantId ?? null,
      message: "Papel insuficiente para esta ação.",
    });
  }
  return true;
}

export function requireAllRoles(
  context: UserAuthorizationContext | null | undefined,
  roles: ReadonlyArray<string>,
): true {
  if (!roles.length || !hasAllRoles(context, roles)) {
    throw new AccessDeniedError({
      allowed: false,
      reason: roles.length ? "ROLE_REQUIRED" : "EMPTY_REQUIREMENT",
      permission: null,
      userId: context?.userId ?? null,
      tenantId: context?.tenantId ?? null,
      message: "Papel insuficiente para esta ação.",
    });
  }
  return true;
}

/** Helper sem throw — útil em UI. */
export function checkPermission(
  context: UserAuthorizationContext | null | undefined,
  permission: string,
  options?: AuthorizeOptions,
): boolean {
  return can(context, permission, options);
}

export function checkAllPermissions(
  context: UserAuthorizationContext | null | undefined,
  permissions: ReadonlyArray<string>,
  options?: AuthorizeOptions,
): boolean {
  return hasAllPermissions(context, permissions, options);
}
