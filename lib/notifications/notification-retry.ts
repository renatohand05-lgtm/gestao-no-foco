/**
 * Sprint 21.5 — Retry estrutural (sem timers).
 */

import type {
  NotificationDeliveryAttempt,
  NotificationChannelId,
  RetryBackoffStrategy,
} from "./types.ts";

export type RetryConfig = {
  maxAttempts?: number;
  backoffStrategy?: RetryBackoffStrategy;
  baseMinutes?: number;
};

export function computeRetryAfterMinutes(
  attempt: number,
  strategy: RetryBackoffStrategy,
  baseMinutes = 5,
): number | null {
  if (strategy === "none") return null;
  if (strategy === "fixed") return baseMinutes;
  if (strategy === "linear") return baseMinutes * attempt;
  // exponential
  return baseMinutes * 2 ** Math.max(0, attempt - 1);
}

export function createDeliveryAttempt(input: {
  channel: NotificationChannelId;
  recipientId: string;
  attempt?: number;
  maxAttempts?: number;
  backoffStrategy?: RetryBackoffStrategy;
  baseMinutes?: number;
  status?: NotificationDeliveryAttempt["status"];
  lastError?: string | null;
  now?: string;
}): NotificationDeliveryAttempt {
  const attempt = input.attempt ?? 1;
  const maxAttempts = input.maxAttempts ?? 3;
  const strategy = input.backoffStrategy ?? "exponential";
  const retryAfter = computeRetryAfterMinutes(
    attempt,
    strategy,
    input.baseMinutes ?? 5,
  );
  const createdAt = input.now ?? new Date().toISOString();
  const nextAttemptAt =
    retryAfter != null && attempt < maxAttempts
      ? new Date(
          new Date(createdAt).getTime() + retryAfter * 60_000,
        ).toISOString()
      : null;

  return {
    id: `nda_${input.channel}_${input.recipientId}_${attempt}`,
    channel: input.channel,
    recipientId: input.recipientId,
    attempt,
    maxAttempts,
    retryable: attempt < maxAttempts,
    retryAfterMinutes: retryAfter,
    backoffStrategy: strategy,
    status: input.status ?? "queued",
    lastError: input.lastError ?? null,
    nextAttemptAt,
    createdAt,
  };
}
