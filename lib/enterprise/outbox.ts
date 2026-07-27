/**
 * Sprint 21.6 RC1 — Outbox Pattern (domínio · sem timers · lock ownership).
 */

import { assertEnterpriseContext } from "./context.ts";
import { EnterpriseError, ENTERPRISE_ERROR_CODES } from "./errors.ts";
import { newEntityId, nowIso } from "./mappers.ts";
import type {
  EnterpriseContext,
  EnterpriseOutboxEvent,
  JsonValue,
  OutboxEventType,
  OutboxStatus,
} from "./types.ts";
import type { OutboxRepository } from "./repositories/outbox-repository.ts";

export type EnqueueEnterpriseEventInput = {
  context: EnterpriseContext;
  eventType: OutboxEventType | string;
  aggregateType: string;
  aggregateId: string;
  payload?: Record<string, JsonValue>;
  availableAt?: string;
  maxAttempts?: number;
};

export async function enqueueEnterpriseEvent(
  repo: OutboxRepository,
  input: EnqueueEnterpriseEventInput,
): Promise<EnterpriseOutboxEvent> {
  assertEnterpriseContext(input.context);
  return repo.enqueue({
    tenantId: input.context.tenantId,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    payload: {
      ...(input.payload ?? {}),
      correlationId: input.context.correlationId,
      requestId: input.context.requestId,
    },
    correlationId: input.context.correlationId,
    requestId: input.context.requestId,
    availableAt: input.availableAt,
    maxAttempts: input.maxAttempts,
  });
}

export async function claimOutboxBatch(
  repo: OutboxRepository,
  input: {
    tenantId: string;
    processorId: string;
    limit?: number;
    now?: string;
    lockTtlSeconds?: number;
  },
): Promise<EnterpriseOutboxEvent[]> {
  const processorId = input.processorId?.trim();
  if (!processorId) {
    throw new EnterpriseError("processorId obrigatório para claim da outbox.", {
      code: ENTERPRISE_ERROR_CODES.VALIDATION,
    });
  }
  return repo.claimBatch({ ...input, processorId });
}

export async function markOutboxCompleted(
  repo: OutboxRepository,
  input: { tenantId: string; id: string; processorId: string; now?: string },
): Promise<EnterpriseOutboxEvent> {
  return repo.markCompleted(input);
}

export async function markOutboxFailed(
  repo: OutboxRepository,
  input: {
    tenantId: string;
    id: string;
    processorId: string;
    error: string;
    retry?: boolean;
    now?: string;
  },
): Promise<EnterpriseOutboxEvent> {
  return repo.markFailed(input);
}

export async function processOutboxEvent(
  repo: OutboxRepository,
  event: EnterpriseOutboxEvent,
  handler: (event: EnterpriseOutboxEvent) => Promise<{ ok: boolean; message: string }>,
  options?: { processorId?: string },
): Promise<{ ok: boolean; event: EnterpriseOutboxEvent; message: string }> {
  if (event.status === "completed") {
    return { ok: true, event, message: "already_completed" };
  }

  const processorId =
    options?.processorId?.trim() ||
    event.lockedBy?.trim() ||
    "outbox-processor";

  if (event.status !== "processing" || !event.lockedBy) {
    await repo.markProcessing({
      tenantId: event.tenantId,
      id: event.id,
      processorId,
    });
  }

  try {
    const result = await handler(event);
    if (!result.ok) {
      const failed = await markOutboxFailed(repo, {
        tenantId: event.tenantId,
        id: event.id,
        processorId,
        error: result.message,
        retry: true,
      });
      return { ok: false, event: failed, message: result.message };
    }
    const completed = await markOutboxCompleted(repo, {
      tenantId: event.tenantId,
      id: event.id,
      processorId,
    });
    return { ok: true, event: completed, message: result.message };
  } catch (err) {
    const message = err instanceof Error ? err.message : "handler_failed";
    const failed = await markOutboxFailed(repo, {
      tenantId: event.tenantId,
      id: event.id,
      processorId,
      error: message,
      retry: true,
    });
    return { ok: false, event: failed, message };
  }
}

export function createOutboxEventDraft(
  partial: Partial<EnterpriseOutboxEvent> &
    Pick<
      EnterpriseOutboxEvent,
      "tenantId" | "eventType" | "aggregateType" | "aggregateId"
    >,
): EnterpriseOutboxEvent {
  const now = nowIso();
  return {
    id: partial.id ?? newEntityId("outbox"),
    tenantId: partial.tenantId,
    eventType: partial.eventType,
    aggregateType: partial.aggregateType,
    aggregateId: partial.aggregateId,
    payload: partial.payload ?? {},
    status: (partial.status as OutboxStatus) ?? "pending",
    attempts: partial.attempts ?? 0,
    maxAttempts: partial.maxAttempts ?? 5,
    correlationId: partial.correlationId ?? null,
    requestId: partial.requestId ?? null,
    availableAt: partial.availableAt ?? now,
    lockedAt: partial.lockedAt ?? null,
    lockedBy: partial.lockedBy ?? null,
    processedAt: partial.processedAt ?? null,
    lastError: partial.lastError ?? null,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

export function assertOutboxTenant(
  event: EnterpriseOutboxEvent,
  tenantId: string,
): void {
  if (event.tenantId !== tenantId) {
    throw new EnterpriseError("Outbox event de outro tenant.", {
      code: ENTERPRISE_ERROR_CODES.TENANT_MISMATCH,
    });
  }
}
