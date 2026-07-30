/**
 * Sprint 22.10 — Taxonomia de erros da Import Engine Enterprise.
 * Categorias: user, validation, permission, file, provider, persistence,
 * integration, temporary, internal.
 */

export type EnterpriseImportErrorCategory =
  | "user"
  | "validation"
  | "permission"
  | "file"
  | "provider"
  | "persistence"
  | "integration"
  | "temporary"
  | "internal";

export const ENTERPRISE_IMPORT_ERROR_CODES = {
  USER_CANCELLED: "IMPORT_USER_CANCELLED",
  VALIDATION_FAILED: "IMPORT_VALIDATION_FAILED",
  PERMISSION_DENIED: "IMPORT_PERMISSION_DENIED",
  FILE_REJECTED: "IMPORT_FILE_REJECTED",
  FILE_TOO_LARGE: "IMPORT_FILE_TOO_LARGE",
  PROVIDER_UNAVAILABLE: "IMPORT_PROVIDER_UNAVAILABLE",
  PROVIDER_MISCONFIGURED: "IMPORT_PROVIDER_MISCONFIGURED",
  PERSISTENCE_FAILED: "IMPORT_PERSISTENCE_FAILED",
  INTEGRATION_PREPARING: "IMPORT_INTEGRATION_PREPARING",
  INTEGRATION_AUTH_FAILED: "IMPORT_INTEGRATION_AUTH_FAILED",
  TEMPORARY_UNAVAILABLE: "IMPORT_TEMPORARY_UNAVAILABLE",
  INTERNAL_ERROR: "IMPORT_INTERNAL_ERROR",
  TENANT_MISMATCH: "IMPORT_TENANT_MISMATCH",
  DUPLICATE_REQUEST: "IMPORT_DUPLICATE_REQUEST",
} as const;

export type EnterpriseImportErrorCode =
  (typeof ENTERPRISE_IMPORT_ERROR_CODES)[keyof typeof ENTERPRISE_IMPORT_ERROR_CODES];

const CATEGORY_BY_CODE: Record<EnterpriseImportErrorCode, EnterpriseImportErrorCategory> = {
  [ENTERPRISE_IMPORT_ERROR_CODES.USER_CANCELLED]: "user",
  [ENTERPRISE_IMPORT_ERROR_CODES.VALIDATION_FAILED]: "validation",
  [ENTERPRISE_IMPORT_ERROR_CODES.PERMISSION_DENIED]: "permission",
  [ENTERPRISE_IMPORT_ERROR_CODES.FILE_REJECTED]: "file",
  [ENTERPRISE_IMPORT_ERROR_CODES.FILE_TOO_LARGE]: "file",
  [ENTERPRISE_IMPORT_ERROR_CODES.PROVIDER_UNAVAILABLE]: "provider",
  [ENTERPRISE_IMPORT_ERROR_CODES.PROVIDER_MISCONFIGURED]: "provider",
  [ENTERPRISE_IMPORT_ERROR_CODES.PERSISTENCE_FAILED]: "persistence",
  [ENTERPRISE_IMPORT_ERROR_CODES.INTEGRATION_PREPARING]: "integration",
  [ENTERPRISE_IMPORT_ERROR_CODES.INTEGRATION_AUTH_FAILED]: "integration",
  [ENTERPRISE_IMPORT_ERROR_CODES.TEMPORARY_UNAVAILABLE]: "temporary",
  [ENTERPRISE_IMPORT_ERROR_CODES.INTERNAL_ERROR]: "internal",
  [ENTERPRISE_IMPORT_ERROR_CODES.TENANT_MISMATCH]: "permission",
  [ENTERPRISE_IMPORT_ERROR_CODES.DUPLICATE_REQUEST]: "validation",
};

const SAFE_FALLBACK =
  "Não foi possível concluir a operação. Tente novamente ou contacte o suporte.";

const STACK_PATTERN = /\n\s+at\s+|^\s*at\s+/m;

export class EnterpriseImportError extends Error {
  readonly category: EnterpriseImportErrorCategory;
  readonly code: EnterpriseImportErrorCode;

  constructor(
    message: string,
    code: EnterpriseImportErrorCode,
    category?: EnterpriseImportErrorCategory,
  ) {
    super(message);
    this.name = "EnterpriseImportError";
    this.code = code;
    this.category = category ?? CATEGORY_BY_CODE[code];
  }
}

export function isEnterpriseImportError(
  error: unknown,
): error is EnterpriseImportError {
  return error instanceof EnterpriseImportError;
}

/** Mensagem segura para cliente — nunca expõe stack traces ou detalhes internos. */
export function toSafeClientMessage(error: unknown): string {
  if (error instanceof EnterpriseImportError) {
    return error.message;
  }

  if (error instanceof Error) {
    const raw = error.message?.trim() ?? "";
    if (!raw || STACK_PATTERN.test(raw) || raw.includes("Error:")) {
      return SAFE_FALLBACK;
    }
    if (
      raw.length > 240 ||
      /\/|\\|supabase|postgres|sql|ECONNREFUSED|ENOTFOUND|stack/i.test(raw)
    ) {
      return SAFE_FALLBACK;
    }
    return raw;
  }

  if (typeof error === "string" && error.trim()) {
    const raw = error.trim();
    if (STACK_PATTERN.test(raw)) return SAFE_FALLBACK;
    return raw.slice(0, 240);
  }

  return SAFE_FALLBACK;
}

export function enterpriseImportErrorFromApiCode(
  code: string,
  message: string,
): EnterpriseImportError {
  const map: Record<string, EnterpriseImportErrorCode> = {
    unauthorized: ENTERPRISE_IMPORT_ERROR_CODES.INTEGRATION_AUTH_FAILED,
    forbidden: ENTERPRISE_IMPORT_ERROR_CODES.PERMISSION_DENIED,
    validation_error: ENTERPRISE_IMPORT_ERROR_CODES.VALIDATION_FAILED,
    rate_limited: ENTERPRISE_IMPORT_ERROR_CODES.TEMPORARY_UNAVAILABLE,
    preparing: ENTERPRISE_IMPORT_ERROR_CODES.INTEGRATION_PREPARING,
    conflict: ENTERPRISE_IMPORT_ERROR_CODES.DUPLICATE_REQUEST,
    internal_error: ENTERPRISE_IMPORT_ERROR_CODES.INTERNAL_ERROR,
  };
  const resolved = map[code] ?? ENTERPRISE_IMPORT_ERROR_CODES.INTERNAL_ERROR;
  return new EnterpriseImportError(message, resolved);
}
