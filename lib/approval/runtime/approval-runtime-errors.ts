/**
 * Sprint 21.7 — Erros do Approval Runtime.
 */

export const APPROVAL_RUNTIME_ERROR_CODES = {
  NOT_FOUND: "APPROVAL_RUNTIME_NOT_FOUND",
  DEFINITION_NOT_FOUND: "APPROVAL_RUNTIME_DEFINITION_NOT_FOUND",
  PERMISSION_DENIED: "APPROVAL_RUNTIME_PERMISSION_DENIED",
  INVALID_STATE: "APPROVAL_RUNTIME_INVALID_STATE",
  IDEMPOTENCY_CONFLICT: "APPROVAL_RUNTIME_IDEMPOTENCY_CONFLICT",
  VALIDATION_FAILED: "APPROVAL_RUNTIME_VALIDATION_FAILED",
  OPERATION_FAILED: "APPROVAL_RUNTIME_OPERATION_FAILED",
} as const;

export type ApprovalRuntimeErrorCode =
  (typeof APPROVAL_RUNTIME_ERROR_CODES)[keyof typeof APPROVAL_RUNTIME_ERROR_CODES];

export class ApprovalRuntimeError extends Error {
  readonly code: ApprovalRuntimeErrorCode;

  constructor(
    message: string,
    code: ApprovalRuntimeErrorCode = APPROVAL_RUNTIME_ERROR_CODES.OPERATION_FAILED,
  ) {
    super(message);
    this.name = "ApprovalRuntimeError";
    this.code = code;
  }
}

export function isApprovalRuntimeError(
  error: unknown,
): error is ApprovalRuntimeError {
  return error instanceof ApprovalRuntimeError;
}
