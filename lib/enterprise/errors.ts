/**
 * Sprint 21.6 — Erros seguros da camada Enterprise.
 */

export const ENTERPRISE_ERROR_CODES = {
  INVALID_CONTEXT: "ENT_INVALID_CONTEXT",
  MISSING_TENANT: "ENT_MISSING_TENANT",
  TENANT_MISMATCH: "ENT_TENANT_MISMATCH",
  IDEMPOTENCY_CONFLICT: "ENT_IDEMPOTENCY_CONFLICT",
  NOT_FOUND: "ENT_NOT_FOUND",
  PERSISTENCE: "ENT_PERSISTENCE",
  TRANSACTION: "ENT_TRANSACTION",
  OUTBOX: "ENT_OUTBOX",
  FORBIDDEN: "ENT_FORBIDDEN",
  VALIDATION: "ENT_VALIDATION",
  GENERIC: "ENT_ERROR",
} as const;

export type EnterpriseErrorCode =
  (typeof ENTERPRISE_ERROR_CODES)[keyof typeof ENTERPRISE_ERROR_CODES];

export class EnterpriseError extends Error {
  readonly code: EnterpriseErrorCode;

  constructor(
    message: string,
    options?: { code?: EnterpriseErrorCode; cause?: unknown },
  ) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = "EnterpriseError";
    this.code = options?.code ?? ENTERPRISE_ERROR_CODES.GENERIC;
  }
}

export class EnterpriseContextError extends EnterpriseError {
  constructor(message = "Contexto Enterprise inválido.") {
    super(message, { code: ENTERPRISE_ERROR_CODES.INVALID_CONTEXT });
    this.name = "EnterpriseContextError";
  }
}

export class EnterpriseIdempotencyError extends EnterpriseError {
  constructor(message = "Conflito de idempotência.") {
    super(message, { code: ENTERPRISE_ERROR_CODES.IDEMPOTENCY_CONFLICT });
    this.name = "EnterpriseIdempotencyError";
  }
}

export class EnterprisePersistenceError extends EnterpriseError {
  constructor(message = "Falha de persistência.", cause?: unknown) {
    super(message, { code: ENTERPRISE_ERROR_CODES.PERSISTENCE, cause });
    this.name = "EnterprisePersistenceError";
  }
}

export function isEnterpriseError(error: unknown): error is EnterpriseError {
  return error instanceof EnterpriseError;
}

/** Transforma erro bruto (ex.: Supabase) em mensagem segura. */
export function toSafeEnterpriseError(
  error: unknown,
  fallback = "Operação Enterprise falhou.",
): EnterpriseError {
  if (error instanceof EnterpriseError) return error;
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;
  const lower = raw.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("42501")) {
    return new EnterpriseError("Acesso negado ao tenant.", {
      code: ENTERPRISE_ERROR_CODES.FORBIDDEN,
    });
  }
  if (lower.includes("duplicate") || lower.includes("23505")) {
    return new EnterpriseIdempotencyError(
      "Registro duplicado ou conflito de chave.",
    );
  }
  // Não vazar stacks / JSON bruto
  if (raw.trim().startsWith("{") || raw.includes("\n    at ")) {
    return new EnterprisePersistenceError(fallback, error);
  }
  return new EnterprisePersistenceError(
    raw.length > 200 ? fallback : raw,
    error,
  );
}
