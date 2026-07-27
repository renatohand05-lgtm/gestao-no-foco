/**
 * Sprint 21.9 — Erros Observability.
 */

export const OBSERVABILITY_ERROR_CODES = {
  PERMISSION_DENIED: "OBSERVABILITY_PERMISSION_DENIED",
  TENANT_REQUIRED: "OBSERVABILITY_TENANT_REQUIRED",
  ACTOR_REQUIRED: "OBSERVABILITY_ACTOR_REQUIRED",
  VALIDATION_FAILED: "OBSERVABILITY_VALIDATION_FAILED",
  NOT_FOUND: "OBSERVABILITY_NOT_FOUND",
} as const;

export type ObservabilityErrorCode =
  (typeof OBSERVABILITY_ERROR_CODES)[keyof typeof OBSERVABILITY_ERROR_CODES];

export class ObservabilityError extends Error {
  readonly code: ObservabilityErrorCode;

  constructor(message: string, code: ObservabilityErrorCode) {
    super(message);
    this.name = "ObservabilityError";
    this.code = code;
  }
}

export function isObservabilityError(error: unknown): error is ObservabilityError {
  return error instanceof ObservabilityError;
}
