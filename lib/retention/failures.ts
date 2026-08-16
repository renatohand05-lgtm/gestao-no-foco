/**
 * Sprint 35.2.3 — classificação de falha. Retry só para transiente.
 */

import { canRetryFailed, retryBackoffMs } from "./rate-limit.ts";

export const PERMANENT_ERROR_CODES = [
  "missing_phone",
  "missing_email",
  "invalid_recipient",
  "opt_out",
  "blocked",
  "invalid_template",
  "not_configured",
  "no_channel",
] as const;

export type FailureKind = "transient" | "permanent";

export function classifyFailure(input: {
  errorCode?: string | null;
  httpStatus?: number | null;
  message?: string | null;
}): FailureKind {
  const code = (input.errorCode ?? "").toLowerCase();
  if ((PERMANENT_ERROR_CODES as readonly string[]).includes(code)) {
    return "permanent";
  }
  const status = input.httpStatus ?? Number(code.replace(/^http_/, ""));
  if (status === 429) return "transient";
  if (status >= 500 && status <= 599) return "transient";
  if (code === "timeout" || code === "network" || code === "unavailable") {
    return "transient";
  }
  const msg = (input.message ?? "").toLowerCase();
  if (/timeout|temporar|unavailable|try again|429/.test(msg)) return "transient";
  if (/invalid|opt-out|blocked|ausente/.test(msg) && !/timeout/.test(msg)) {
    return "permanent";
  }
  return "transient";
}

export function canAutoRetry(input: {
  failureKind?: FailureKind | null;
  attemptCount: number;
  lastAttemptAt?: string | null;
  now?: number;
  maxAttempts?: number;
}): boolean {
  if (input.failureKind === "permanent") return false;
  return canRetryFailed({
    attemptCount: input.attemptCount,
    lastAttemptAt: input.lastAttemptAt,
    now: input.now,
    maxAttempts: input.maxAttempts,
  });
}

export function nextRetryAtIso(attemptCount: number, now = Date.now()): string {
  return new Date(now + retryBackoffMs(attemptCount)).toISOString();
}

/** Retry na mesma linha. Falha permanente não agenda próxima tentativa. */
export function planRetry(input: {
  errorCode?: string | null;
  httpStatus?: number | null;
  message?: string | null;
  attemptCount: number;
  lastAttemptAt?: string | null;
  now?: number;
}): {
  sameRow: true;
  failureKind: FailureKind;
  nextStatus: "failed" | "queued";
  nextRetryAt: string | null;
  retry: boolean;
} {
  const failureKind = classifyFailure(input);
  if (failureKind === "permanent") {
    return {
      sameRow: true,
      failureKind,
      nextStatus: "failed",
      nextRetryAt: null,
      retry: false,
    };
  }
  const retry = canAutoRetry({
    failureKind,
    attemptCount: input.attemptCount,
    lastAttemptAt: input.lastAttemptAt,
    now: input.now,
  });
  return {
    sameRow: true,
    failureKind,
    nextStatus: "failed",
    nextRetryAt: retry ? nextRetryAtIso(input.attemptCount, input.now) : null,
    retry,
  };
}
