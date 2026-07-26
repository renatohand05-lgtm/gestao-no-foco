/**
 * Sprint 21.1 — Erros de autorização (códigos estáveis · mensagens seguras).
 */

import type { AuthorizationDecision, AuthorizationReason } from "./types.ts";

export const AUTH_ERROR_CODES = {
  ACCESS_DENIED: "RBAC_ACCESS_DENIED",
  AUTHORIZATION_FAILED: "RBAC_AUTHORIZATION_FAILED",
  INVALID_CONTEXT: "RBAC_INVALID_CONTEXT",
  MISSING_TENANT: "RBAC_MISSING_TENANT",
  UNKNOWN_PERMISSION: "RBAC_UNKNOWN_PERMISSION",
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

const SAFE_MESSAGES: Record<AuthorizationReason, string> = {
  ALLOWED_ROLE: "Acesso permitido.",
  ALLOWED_ADDITIONAL: "Acesso permitido.",
  ALLOWED_PLATFORM: "Acesso permitido.",
  EXPLICIT_DENY: "Você não tem permissão para esta ação.",
  POLICY_DENIED: "Você não tem permissão para esta ação.",
  DENY_BY_DEFAULT: "Você não tem permissão para esta ação.",
  UNKNOWN_PERMISSION: "Permissão inválida.",
  INVALID_CONTEXT: "Contexto de autorização inválido.",
  MISSING_TENANT: "Contexto de empresa ausente.",
  TENANT_MISMATCH: "Ação não permitida nesta empresa.",
  ROLE_REQUIRED: "Papel insuficiente para esta ação.",
  EMPTY_REQUIREMENT: "Requisito de autorização inválido.",
};

export function safeAuthMessage(reason: AuthorizationReason): string {
  return SAFE_MESSAGES[reason] ?? "Você não tem permissão para esta ação.";
}

export class AuthorizationError extends Error {
  readonly code: AuthErrorCode;
  readonly reason: AuthorizationReason;
  readonly decision: AuthorizationDecision | null;

  constructor(
    message: string,
    options?: {
      code?: AuthErrorCode;
      reason?: AuthorizationReason;
      decision?: AuthorizationDecision | null;
      cause?: unknown;
    },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AuthorizationError";
    this.code = options?.code ?? AUTH_ERROR_CODES.AUTHORIZATION_FAILED;
    this.reason = options?.reason ?? "DENY_BY_DEFAULT";
    this.decision = options?.decision ?? null;
  }
}

export class AccessDeniedError extends AuthorizationError {
  constructor(
    decision?: AuthorizationDecision | null,
    message?: string,
  ) {
    const reason = decision?.reason ?? "DENY_BY_DEFAULT";
    super(message ?? safeAuthMessage(reason), {
      code: AUTH_ERROR_CODES.ACCESS_DENIED,
      reason,
      decision: decision ?? null,
    });
    this.name = "AccessDeniedError";
  }
}

export function isAuthorizationError(
  error: unknown,
): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function isAccessDeniedError(
  error: unknown,
): error is AccessDeniedError {
  return error instanceof AccessDeniedError;
}
