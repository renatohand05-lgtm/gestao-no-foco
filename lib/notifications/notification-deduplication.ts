/**
 * Sprint 21.5 — Deduplicação em memória (determinística).
 */

import type {
  DeduplicationMode,
  NotificationRequest,
  NotificationResult,
} from "./types.ts";

export type DedupeRecord = {
  key: string;
  notificationId: string;
  at: number;
  tenantId: string;
};

const memory = new Map<string, DedupeRecord>();

export function buildDeduplicationKey(
  request: NotificationRequest,
): string {
  if (request.deduplicationKey) {
    return `${request.tenantId}::${request.deduplicationKey}`;
  }
  const recipientIds = request.recipients
    .map((r) => r.id)
    .sort()
    .join(",");
  const target = String(request.metadata.targetId ?? "");
  return [
    request.tenantId,
    request.event,
    recipientIds,
    target,
    request.correlationId ?? "",
  ].join("::");
}

export type DedupeEval = {
  duplicate: boolean;
  mode: DeduplicationMode;
  previousId: string | null;
  action: "proceed" | "suppress" | "merge" | "replace" | "allow";
};

export function evaluateDeduplication(
  request: NotificationRequest,
  options?: { windowMinutes?: number; now?: number },
): DedupeEval {
  const mode = request.deduplicationMode ?? "suppress";
  if (mode === "allow") {
    return {
      duplicate: false,
      mode,
      previousId: null,
      action: "allow",
    };
  }

  const key = buildDeduplicationKey(request);
  const now = options?.now ?? Date.now();
  const windowMs = (options?.windowMinutes ?? 60) * 60_000;
  const prev = memory.get(key);

  if (!prev || now - prev.at > windowMs || prev.tenantId !== request.tenantId) {
    return {
      duplicate: false,
      mode,
      previousId: null,
      action: "proceed",
    };
  }

  if (mode === "suppress") {
    return {
      duplicate: true,
      mode,
      previousId: prev.notificationId,
      action: "suppress",
    };
  }
  if (mode === "merge") {
    return {
      duplicate: true,
      mode,
      previousId: prev.notificationId,
      action: "merge",
    };
  }
  return {
    duplicate: true,
    mode,
    previousId: prev.notificationId,
    action: "replace",
  };
}

export function rememberNotification(
  request: NotificationRequest,
  now = Date.now(),
): void {
  const key = buildDeduplicationKey(request);
  memory.set(key, {
    key,
    notificationId: request.id,
    at: now,
    tenantId: request.tenantId,
  });
}

export function clearDeduplicationMemory(): void {
  memory.clear();
}

export function applyDeduplicationToResult(
  result: NotificationResult,
  evalResult: DedupeEval,
): NotificationResult {
  if (evalResult.action === "suppress") {
    return {
      ...result,
      ok: true,
      status: "deduplicated",
      suppressed: true,
      deduplicated: true,
      reason: "DUPLICATE_SUPPRESSED",
      routedChannels: [],
      attempts: [],
      explanation: [
        ...result.explanation,
        `dedupe:suppress:${evalResult.previousId}`,
      ],
    };
  }
  if (evalResult.action === "merge") {
    return {
      ...result,
      deduplicated: true,
      reason: "DUPLICATE_MERGED",
      explanation: [
        ...result.explanation,
        `dedupe:merge:${evalResult.previousId}`,
      ],
    };
  }
  if (evalResult.action === "replace") {
    return {
      ...result,
      deduplicated: true,
      reason: "DUPLICATE_REPLACED",
      explanation: [
        ...result.explanation,
        `dedupe:replace:${evalResult.previousId}`,
      ],
    };
  }
  return result;
}
