/**
 * Sprint 21.6 — Integration Runner + Integration Service.
 */

import { assertEnterpriseContext } from "./context.ts";
import { enterpriseEventBus } from "./event-bus.ts";
import {
  claimOutboxBatch,
  markOutboxCompleted,
  markOutboxFailed,
  processOutboxEvent,
} from "./outbox.ts";
import type { EnterpriseContext, IntegrationHandler } from "./types.ts";
import type {
  AuditRepository,
  NotificationRepository,
  OutboxRepository,
} from "./repositories/contracts.ts";
import { newEntityId, nowIso } from "./mappers.ts";

export type IntegrationRunnerDeps = {
  outbox: OutboxRepository;
  audit: AuditRepository;
  notification: NotificationRepository;
};

export function registerDefaultIntegrationHandlers(
  deps: IntegrationRunnerDeps,
): void {
  const auditHandler: IntegrationHandler = async ({ event, context }) => {
    if (event.tenantId !== context.tenantId) {
      return { ok: false, handled: true, message: "tenant_mismatch" };
    }
    // Já auditado na origem; registra eco de integração
    await deps.audit.append({
      tenantId: context.tenantId,
      userId: null,
      actorType: "system",
      systemActorKey: "integration-runner",
      event: "INTEGRATION_PROCESSED",
      category: "system",
      severity: "info",
      targetType: event.aggregateType,
      targetId: event.aggregateId,
      resource: null,
      module: "integration",
      description: event.eventType,
      metadata: { outboxId: event.id },
      origin: "integration",
      correlationId: event.correlationId ?? context.correlationId,
      requestId: event.requestId ?? context.requestId,
      sessionId: null,
      ipAddress: null,
      device: null,
    });
    return {
      ok: true,
      handled: true,
      message: "audit_echo",
      sideEffects: ["audit"],
    };
  };

  const notificationHandler: IntegrationHandler = async ({ event, context }) => {
    if (
      event.eventType !== "APPROVAL_REQUESTED" &&
      event.eventType !== "APPROVAL_DECIDED" &&
      event.eventType !== "WORKFLOW_TRANSITIONED" &&
      event.eventType !== "WORKFLOW_TRANSITION_EXECUTED" &&
      event.eventType !== "NOTIFICATION_REQUESTED"
    ) {
      return { ok: true, handled: false, message: "skip" };
    }

    const title = `Evento ${event.eventType}`;
    const message = `Agregado ${event.aggregateType}:${event.aggregateId}`;
    const n = await deps.notification.create({
      id: newEntityId("notif"),
      tenantId: context.tenantId,
      event: event.eventType,
      category:
        event.eventType.startsWith("APPROVAL")
          ? "approval"
          : event.eventType.startsWith("WORKFLOW")
            ? "workflow"
            : "system",
      priority: "normal",
      title,
      message,
      status: "queued",
      templateId: null,
      source: "integration",
      metadata: { outboxId: event.id },
      correlationId: event.correlationId ?? context.correlationId,
      requestId: event.requestId ?? context.requestId,
      scheduledAt: null,
      expiresAt: null,
      deduplicationKey: `outbox:${event.id}`,
    });

    await deps.notification.saveRecipients([
      {
        id: newEntityId("nrec"),
        tenantId: context.tenantId,
        notificationId: n.id,
        recipientType: context.userId ? "user" : "system",
        recipientId: context.userId ?? "integration-runner",
        channel: "in_app",
        status: "queued",
        readAt: null,
        deliveredAt: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ]);

    return {
      ok: true,
      handled: true,
      message: "notification_created",
      sideEffects: ["notification"],
    };
  };

  enterpriseEventBus.unregisterAll();
  for (const type of [
    "APPROVAL_REQUESTED",
    "APPROVAL_DECIDED",
    "WORKFLOW_TRANSITIONED",
    "WORKFLOW_TRANSITION_EXECUTED",
    "NOTIFICATION_REQUESTED",
    "AUTHORIZATION_DENIED",
    "AUDIT_EVENT_REQUESTED",
    "AUDIT_EVENT_CREATED",
  ]) {
    enterpriseEventBus.register(type, auditHandler);
    if (type !== "AUDIT_EVENT_CREATED" && type !== "AUDIT_EVENT_REQUESTED") {
      enterpriseEventBus.register(type, notificationHandler);
    }
  }
}

export async function runIntegrationHandlers(
  context: EnterpriseContext,
  event: Parameters<IntegrationHandler>[0]["event"],
) {
  assertEnterpriseContext(context);
  const handlers = enterpriseEventBus.getHandlers(event.eventType);
  const sideEffects: string[] = [];
  for (const handler of handlers) {
    const result = await handler({ event, context });
    if (!result.ok) return result;
    if (result.sideEffects) sideEffects.push(...result.sideEffects);
  }
  return {
    ok: true,
    handled: handlers.length > 0,
    message: handlers.length ? "processed" : "no_handlers",
    sideEffects,
  };
}

export function createIntegrationService(deps: IntegrationRunnerDeps) {
  registerDefaultIntegrationHandlers(deps);

  return {
    async processPendingEvents(
      context: EnterpriseContext,
      options?: { limit?: number; now?: string; processorId?: string },
    ) {
      assertEnterpriseContext(context);
      const processorId =
        options?.processorId?.trim() || "integration-runner";
      const batch = await claimOutboxBatch(deps.outbox, {
        tenantId: context.tenantId,
        processorId,
        limit: options?.limit ?? 20,
        now: options?.now,
      });

      const results = [];
      for (const event of batch) {
        const processed = await processOutboxEvent(
          deps.outbox,
          event,
          async (e) => {
            const r = await runIntegrationHandlers(context, e);
            return { ok: r.ok, message: r.message };
          },
          { processorId },
        );
        results.push(processed);
      }
      return results;
    },

    async retryFailedEvents(context: EnterpriseContext) {
      assertEnterpriseContext(context);
      const released = await deps.outbox.releaseExpiredLocks({
        tenantId: context.tenantId,
      });
      return { released };
    },

    async getIntegrationHealth(context: EnterpriseContext) {
      assertEnterpriseContext(context);
      const pending = await deps.outbox.countByStatus(context.tenantId, "pending");
      const failed = await deps.outbox.countByStatus(context.tenantId, "failed");
      const dead = await deps.outbox.countByStatus(context.tenantId, "dead");
      const processing = await deps.outbox.countByStatus(
        context.tenantId,
        "processing",
      );
      return { pending, failed, dead, processing };
    },

    markCompleted: markOutboxCompleted,
    markFailed: markOutboxFailed,
  };
}
