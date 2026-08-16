/**
 * Sprint 35.2.2 — rate limit básico por tenant/canal (sem secrets).
 */

export const DEFAULT_TENANT_HOURLY_LIMIT = 80;

export function shouldHaltRateLimit(input: {
  sentLastHour: number;
  limit?: number;
}): { halt: boolean; note: string } {
  const limit = input.limit ?? DEFAULT_TENANT_HOURLY_LIMIT;
  if (input.sentLastHour >= limit) {
    return {
      halt: true,
      note: "Rate limit do tenant atingido — fila pausada.",
    };
  }
  return { halt: false, note: "" };
}

export function retryBackoffMs(attemptCount: number): number {
  const n = Math.max(0, attemptCount);
  const minutes = Math.min(60, 2 ** Math.min(n, 5));
  return minutes * 60_000;
}

export function canRetryFailed(input: {
  attemptCount: number;
  lastAttemptAt?: string | null;
  now?: number;
  maxAttempts?: number;
}): boolean {
  const max = input.maxAttempts ?? 5;
  if (input.attemptCount >= max) return false;
  if (!input.lastAttemptAt) return true;
  const now = input.now ?? Date.now();
  const elapsed = now - Date.parse(input.lastAttemptAt);
  if (!Number.isFinite(elapsed)) return true;
  return elapsed >= retryBackoffMs(input.attemptCount);
}
