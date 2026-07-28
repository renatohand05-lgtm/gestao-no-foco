/**
 * Sprint 22.1 — Bridge Fase 21 (RBAC/Audit/Outbox/Notifications/Workflow/Approval/Observability).
 * Timeline consome Audit automaticamente (module financeiro).
 */

import type { EnterpriseContext } from "../../enterprise/types.ts";
import type { AuditRepository } from "../../enterprise/repositories/contracts.ts";
import type { OutboxRepository } from "../../enterprise/repositories/outbox-repository.ts";
import type { NotificationRepository } from "../../enterprise/repositories/contracts.ts";
import type { WorkflowRepository } from "../../enterprise/repositories/contracts.ts";
import type { ApprovalRepository } from "../../enterprise/repositories/contracts.ts";
import { enqueueEnterpriseEvent } from "../../enterprise/outbox.ts";
import {
  createLoggingService,
  createMetricsService,
  createTraceService,
  type LoggingService,
  type MetricsService,
  type TraceService,
} from "../../observability/index.ts";
import type { JsonValue } from "../../enterprise/types.ts";

export type FinanceEnterpriseBridgeDeps = {
  audit: Pick<AuditRepository, "append">;
  outbox: OutboxRepository;
  notification?: Pick<NotificationRepository, "create" | "saveRecipients">;
  workflow?: Pick<WorkflowRepository, "listInstances">;
  approval?: Pick<ApprovalRepository, "listRequests">;
  logging?: LoggingService;
  metrics?: MetricsService;
  tracing?: TraceService;
};

export type FinanceMutationEvent = {
  event: string;
  targetType: string;
  targetId: string;
  description: string;
  severity?: string;
  metadata?: Record<string, JsonValue>;
};

export function createFinanceEnterpriseBridge(
  deps: FinanceEnterpriseBridgeDeps,
) {
  const logging = deps.logging ?? createLoggingService();
  const metrics = deps.metrics ?? createMetricsService();
  const tracing = deps.tracing ?? createTraceService();

  return {
    logging,
    metrics,
    tracing,

    async recordMutation(
      context: EnterpriseContext,
      input: FinanceMutationEvent,
    ) {
      const started = Date.now();
      const span = tracing.start({
        tenantId: context.tenantId,
        module: "financeiro",
        action: input.event,
        correlationId: context.correlationId,
        requestId: context.requestId,
      });

      try {
        const auditRow = await deps.audit.append({
          tenantId: context.tenantId,
          userId: context.userId,
          actorType: context.actorType,
          systemActorKey: context.systemActorKey,
          event: input.event,
          category: "financeiro",
          severity: input.severity ?? "info",
          targetType: input.targetType,
          targetId: input.targetId,
          resource: input.targetType,
          module: "financeiro",
          description: input.description,
          metadata: input.metadata ?? {},
          origin: context.source,
          correlationId: context.correlationId,
          requestId: context.requestId,
          sessionId: context.sessionId,
          ipAddress: null,
          device: null,
        });

        await enqueueEnterpriseEvent(deps.outbox, {
          context,
          eventType: input.event,
          aggregateType: input.targetType,
          aggregateId: input.targetId,
          payload: {
            description: input.description,
            auditId: auditRow.id,
            ...(input.metadata ?? {}),
          },
        });

        // Notifications — best effort
        if (deps.notification && context.userId) {
          try {
            const notif = await deps.notification.create({
              id: `notif_fin_${Date.now().toString(36)}`,
              tenantId: context.tenantId,
              event: input.event,
              category: "financeiro",
              priority: "normal",
              title: input.description,
              message: input.description,
              status: "queued",
              templateId: null,
              source: "finance_core",
              metadata: input.metadata ?? {},
              correlationId: context.correlationId,
              requestId: context.requestId,
              scheduledAt: null,
              expiresAt: null,
              deduplicationKey: `${input.event}:${input.targetId}:${context.correlationId}`,
            });
            await deps.notification.saveRecipients([
              {
                id: `nrec_${Date.now().toString(36)}`,
                tenantId: context.tenantId,
                notificationId: notif.id,
                recipientType: "user",
                recipientId: context.userId,
                channel: "in_app",
                status: "queued",
                readAt: null,
                deliveredAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ]);
          } catch {
            // não bloqueia mutação financeira
          }
        }

        // Workflow / Approval — consumo read (existência / pressão)
        if (deps.workflow) {
          try {
            await deps.workflow.listInstances(context.tenantId);
          } catch {
            /* optional */
          }
        }
        if (deps.approval?.listRequests) {
          try {
            await deps.approval.listRequests({
              tenantId: context.tenantId,
              page: 1,
              limit: 1,
              orderBy: "createdAt",
              orderDir: "desc",
            });
          } catch {
            /* optional */
          }
        }

        const duration = Date.now() - started;
        metrics.recordRequest(
          context.tenantId,
          "financeiro",
          duration,
          "ok",
          { kind: "server_action", action: input.event, module: "financeiro" },
        );
        logging.log({
          tenantId: context.tenantId,
          module: "financeiro",
          action: input.event,
          actor: context.userId,
          severity: "info",
          correlationId: context.correlationId,
          duration,
          status: "ok",
          metadata: { targetType: input.targetType, targetId: input.targetId },
        });
        tracing.end(span.traceId, "ok");
        return auditRow;
      } catch (error) {
        metrics.recordRequest(
          context.tenantId,
          "financeiro",
          Date.now() - started,
          "error",
          { kind: "server_action", action: input.event, module: "financeiro" },
        );
        tracing.end(span.traceId, "error");
        throw error;
      }
    },
  };
}

export type FinanceEnterpriseBridge = ReturnType<
  typeof createFinanceEnterpriseBridge
>;
