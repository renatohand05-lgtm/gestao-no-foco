/**
 * Sprint 30.7 — Idempotência e deduplicação de execuções.
 */

import type { AutomationExecution, AutomationRule } from "./types.ts";

export function buildIdempotencyKey(args: {
  tenantId: string;
  ruleId: string;
  triggerType: string;
  entityId: string;
  windowBucket: string;
}): string {
  return [
    args.tenantId,
    args.ruleId,
    args.triggerType,
    args.entityId,
    args.windowBucket,
  ].join(":");
}

export function windowBucket(nowMs = Date.now(), sizeMs = 60_000): string {
  return String(Math.floor(nowMs / sizeMs));
}

export function buildCorrelationId(prefix = "auto"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function findDuplicateExecution(
  executions: AutomationExecution[],
  idempotencyKey: string,
): AutomationExecution | undefined {
  return executions.find(
    (e) =>
      e.idempotencyKey === idempotencyKey &&
      (e.status === "completed" ||
        e.status === "partially_completed" ||
        e.status === "executing" ||
        e.status === "waiting_approval" ||
        e.status === "queued"),
  );
}

export function shouldSkipIdempotentAction(
  executions: AutomationExecution[],
  rule: AutomationRule,
  actionId: string,
  entityId: string,
): boolean {
  return executions.some(
    (e) =>
      e.ruleId === rule.id &&
      !e.dryRun &&
      (e.status === "completed" || e.status === "partially_completed") &&
      e.actionsExecuted.some(
        (a) =>
          a.actionId === actionId &&
          a.status === "executed" &&
          a.result?.entityId === entityId,
      ),
  );
}

export type RetryDecision =
  | { retry: true; delayMs: number }
  | { retry: false; reason: string };

export function classifyRetry(errorCode: string | null, retryCount: number, max = 3): RetryDecision {
  if (retryCount >= max) {
    return { retry: false, reason: "Máximo de tentativas atingido." };
  }
  const safe = new Set([
    "TRANSIENT",
    "TIMEOUT",
    "NETWORK",
    "LOCK_BUSY",
  ]);
  if (!errorCode || !safe.has(errorCode)) {
    return { retry: false, reason: "Erro não elegível a retry." };
  }
  const delayMs = Math.min(30_000, 500 * 2 ** retryCount);
  return { retry: true, delayMs };
}
