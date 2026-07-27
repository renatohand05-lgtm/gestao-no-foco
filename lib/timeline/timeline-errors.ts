/**
 * Sprint 21.8 — Erros da Activity Timeline.
 */

export const TIMELINE_ERROR_CODES = {
  PERMISSION_DENIED: "TIMELINE_PERMISSION_DENIED",
  TENANT_REQUIRED: "TIMELINE_TENANT_REQUIRED",
  NOT_FOUND: "TIMELINE_NOT_FOUND",
  VALIDATION_FAILED: "TIMELINE_VALIDATION_FAILED",
  OPERATION_FAILED: "TIMELINE_OPERATION_FAILED",
} as const;

export type TimelineErrorCode =
  (typeof TIMELINE_ERROR_CODES)[keyof typeof TIMELINE_ERROR_CODES];

export class TimelineError extends Error {
  readonly code: TimelineErrorCode;

  constructor(
    message: string,
    code: TimelineErrorCode = TIMELINE_ERROR_CODES.OPERATION_FAILED,
  ) {
    super(message);
    this.name = "TimelineError";
    this.code = code;
  }
}

export function isTimelineError(error: unknown): error is TimelineError {
  return error instanceof TimelineError;
}
