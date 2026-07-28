/**
 * Sprint 22.1 — Erros Finance Core.
 */

export const FINANCE_ERROR_CODES = {
  PERMISSION_DENIED: "FINANCE_PERMISSION_DENIED",
  VALIDATION: "FINANCE_VALIDATION",
  NOT_FOUND: "FINANCE_NOT_FOUND",
  CONFLICT: "FINANCE_CONFLICT",
} as const;

export type FinanceErrorCode =
  (typeof FINANCE_ERROR_CODES)[keyof typeof FINANCE_ERROR_CODES];

export class FinanceError extends Error {
  readonly code: FinanceErrorCode;

  constructor(message: string, code: FinanceErrorCode) {
    super(message);
    this.name = "FinanceError";
    this.code = code;
  }
}

export function isFinanceError(error: unknown): error is FinanceError {
  return error instanceof FinanceError;
}
