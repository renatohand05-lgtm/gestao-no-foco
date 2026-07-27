/**
 * Sprint 21.4 — Erros do Approval Engine.
 */

import type { ApprovalDecisionResult } from "./types.ts";

export const APPROVAL_ERROR_CODES = {
  INVALID_DEFINITION: "APPR_INVALID_DEFINITION",
  INVALID_DECISION: "APPR_INVALID_DECISION",
  NOT_FOUND: "APPR_NOT_FOUND",
  INVALID_CONTEXT: "APPR_INVALID_CONTEXT",
  TENANT_MISMATCH: "APPR_TENANT_MISMATCH",
  GENERIC: "APPR_ERROR",
} as const;

export type ApprovalErrorCode =
  (typeof APPROVAL_ERROR_CODES)[keyof typeof APPROVAL_ERROR_CODES];

export class ApprovalError extends Error {
  readonly code: ApprovalErrorCode;
  readonly decision: ApprovalDecisionResult | null;

  constructor(
    message: string,
    options?: {
      code?: ApprovalErrorCode;
      decision?: ApprovalDecisionResult | null;
      cause?: unknown;
    },
  ) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = "ApprovalError";
    this.code = options?.code ?? APPROVAL_ERROR_CODES.GENERIC;
    this.decision = options?.decision ?? null;
  }
}

export class InvalidApprovalDefinitionError extends ApprovalError {
  constructor(message = "Definição de aprovação inválida.") {
    super(message, { code: APPROVAL_ERROR_CODES.INVALID_DEFINITION });
    this.name = "InvalidApprovalDefinitionError";
  }
}

export class InvalidApprovalDecisionError extends ApprovalError {
  constructor(
    message = "Decisão de aprovação não permitida.",
    decision?: ApprovalDecisionResult | null,
  ) {
    super(message, {
      code: APPROVAL_ERROR_CODES.INVALID_DECISION,
      decision: decision ?? null,
    });
    this.name = "InvalidApprovalDecisionError";
  }
}

export class ApprovalNotFoundError extends ApprovalError {
  constructor(message = "Aprovação não encontrada.") {
    super(message, { code: APPROVAL_ERROR_CODES.NOT_FOUND });
    this.name = "ApprovalNotFoundError";
  }
}

export function isApprovalError(error: unknown): error is ApprovalError {
  return error instanceof ApprovalError;
}
