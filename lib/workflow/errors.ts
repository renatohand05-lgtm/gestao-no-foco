/**
 * Sprint 21.3 — Erros do Workflow Engine (códigos estáveis · mensagens seguras).
 */

import type { WorkflowDecision } from "./types.ts";

export const WORKFLOW_ERROR_CODES = {
  INVALID_DEFINITION: "WF_INVALID_DEFINITION",
  INVALID_TRANSITION: "WF_INVALID_TRANSITION",
  CONDITION_FAILED: "WF_CONDITION_FAILED",
  NOT_FOUND: "WF_NOT_FOUND",
  INVALID_CONTEXT: "WF_INVALID_CONTEXT",
  TENANT_MISMATCH: "WF_TENANT_MISMATCH",
  GENERIC: "WF_ERROR",
} as const;

export type WorkflowErrorCode =
  (typeof WORKFLOW_ERROR_CODES)[keyof typeof WORKFLOW_ERROR_CODES];

export class WorkflowError extends Error {
  readonly code: WorkflowErrorCode;
  readonly decision: WorkflowDecision | null;

  constructor(
    message: string,
    options?: {
      code?: WorkflowErrorCode;
      decision?: WorkflowDecision | null;
      cause?: unknown;
    },
  ) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = "WorkflowError";
    this.code = options?.code ?? WORKFLOW_ERROR_CODES.GENERIC;
    this.decision = options?.decision ?? null;
  }
}

export class InvalidWorkflowDefinitionError extends WorkflowError {
  constructor(message = "Definição de workflow inválida.") {
    super(message, { code: WORKFLOW_ERROR_CODES.INVALID_DEFINITION });
    this.name = "InvalidWorkflowDefinitionError";
  }
}

export class InvalidTransitionError extends WorkflowError {
  constructor(
    message = "Transição não permitida.",
    decision?: WorkflowDecision | null,
  ) {
    super(message, {
      code: WORKFLOW_ERROR_CODES.INVALID_TRANSITION,
      decision: decision ?? null,
    });
    this.name = "InvalidTransitionError";
  }
}

export class WorkflowConditionError extends WorkflowError {
  constructor(message = "Condição de workflow não satisfeita.") {
    super(message, { code: WORKFLOW_ERROR_CODES.CONDITION_FAILED });
    this.name = "WorkflowConditionError";
  }
}

export class WorkflowNotFoundError extends WorkflowError {
  constructor(message = "Workflow não encontrado.") {
    super(message, { code: WORKFLOW_ERROR_CODES.NOT_FOUND });
    this.name = "WorkflowNotFoundError";
  }
}

export function isWorkflowError(error: unknown): error is WorkflowError {
  return error instanceof WorkflowError;
}
