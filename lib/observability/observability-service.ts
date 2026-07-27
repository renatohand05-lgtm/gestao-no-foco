/**
 * Sprint 21.9 — Observability Service (orquestrador read-only).
 */

import type { EnterpriseContext } from "../enterprise/types.ts";
import type {
  ApprovalRepository,
  AuditRepository,
  NotificationRepository,
  OutboxRepository,
  WorkflowRepository,
} from "../enterprise/repositories/contracts.ts";
import {
  mergeObservabilityContext,
  type ObservabilityAuthorizationSnapshot,
} from "./observability-context.ts";
import {
  assertObservabilityActor,
  assertObservabilityReadPermission,
  assertObservabilityTenant,
} from "./observability-validator.ts";
import { createAlertService, type AlertService } from "./alert-service.ts";
import {
  createDiagnosticsService,
  type DiagnosticsService,
} from "./diagnostics-service.ts";
import {
  createHealthService,
  type HealthProbeResult,
  type HealthService,
} from "./health-service.ts";
import { createLoggingService, type LoggingService } from "./logging-service.ts";
import { createMetricsService, type MetricsService } from "./metrics-service.ts";
import { createStatusService, type StatusService } from "./status-service.ts";
import { createTraceService, type TraceService } from "./trace-service.ts";
import type {
  ObservabilityFilters,
  ObservabilitySnapshot,
  TraceSpan,
} from "./observability-types.ts";
import { OBSERVABILITY_ERROR_CODES, ObservabilityError } from "./observability-errors.ts";

export type ObservabilityServiceDeps = {
  audit?: Pick<AuditRepository, "list">;
  workflow?: Pick<WorkflowRepository, "listInstances">;
  approval?: Pick<ApprovalRepository, "listRequests">;
  notification?: Pick<NotificationRepository, "listForUser">;
  outbox?: Pick<OutboxRepository, "countByStatus">;
  probeDatabase?: () => Promise<HealthProbeResult>;
  probeSupabase?: () => Promise<HealthProbeResult>;
  probeStorage?: () => Promise<HealthProbeResult>;
  resolveAuthorization?: (
    context: EnterpriseContext,
  ) => Promise<ObservabilityAuthorizationSnapshot | null>;
  /** Contadores opcionais de timeline (sem modificar Timeline). */
  countTimelineEvents?: (tenantId: string) => Promise<number>;
  logging?: LoggingService;
  metrics?: MetricsService;
  tracing?: TraceService;
  alerts?: AlertService;
  health?: HealthService;
  status?: StatusService;
  diagnostics?: DiagnosticsService;
};

export function createObservabilityService(deps: ObservabilityServiceDeps = {}) {
  const logging = deps.logging ?? createLoggingService();
  const metrics = deps.metrics ?? createMetricsService();
  const tracing = deps.tracing ?? createTraceService();
  const alerts = deps.alerts ?? createAlertService();
  const health =
    deps.health ??
    createHealthService({
      audit: deps.audit,
      workflow: deps.workflow,
      approval: deps.approval,
      notification: deps.notification,
      outbox: deps.outbox,
      probeDatabase: deps.probeDatabase,
      probeSupabase: deps.probeSupabase,
      probeStorage: deps.probeStorage,
    });
  const status = deps.status ?? createStatusService();
  const diagnostics = deps.diagnostics ?? createDiagnosticsService();

  async function authorize(context: EnterpriseContext) {
    assertObservabilityTenant(context);
    assertObservabilityActor(context);
    const auth = deps.resolveAuthorization
      ? await deps.resolveAuthorization(context)
      : null;
    const merged = mergeObservabilityContext(context, auth);
    assertObservabilityReadPermission(auth, merged);
    return { auth, context: merged };
  }

  async function collectCounters(tenantId: string) {
    let outboxPending = 0;
    let outboxFailed = 0;
    let workflowBlocked = 0;
    let approvals = 0;
    const notifications = 0;
    const notificationsFailed = 0;
    let timelineEvents = 0;
    let approvalsExpired = 0;
    let workflowExecutions = 0;

    if (deps.outbox) {
      outboxPending = await deps.outbox.countByStatus(tenantId, "pending");
      const failed = await deps.outbox.countByStatus(tenantId, "failed");
      const dead = await deps.outbox.countByStatus(tenantId, "dead");
      outboxFailed = failed + dead;
    }

    if (deps.workflow) {
      const blocked = await deps.workflow.listInstances(tenantId, {
        status: "blocked",
      });
      workflowBlocked = blocked.filter((i) => i.tenantId === tenantId).length;
      const all = await deps.workflow.listInstances(tenantId);
      workflowExecutions = all.filter((i) => i.tenantId === tenantId).length;
    }

    if (deps.approval?.listRequests) {
      const listed = await deps.approval.listRequests({
        tenantId,
        page: 1,
        limit: 50,
        orderBy: "createdAt",
        orderDir: "desc",
      });
      approvals = listed.items.filter((r) => r.tenantId === tenantId).length;
      approvalsExpired = listed.items.filter(
        (r) => r.tenantId === tenantId && r.status === "expired",
      ).length;
    }

    if (deps.countTimelineEvents) {
      timelineEvents = await deps.countTimelineEvents(tenantId);
    } else if (deps.audit) {
      const rows = await deps.audit.list(tenantId, { limit: 80 });
      timelineEvents = rows.filter((r) => r.tenantId === tenantId).length;
    }

    return {
      outboxPending,
      outboxFailed,
      workflowBlocked,
      approvals,
      approvalsExpired,
      notifications,
      notificationsFailed,
      timelineEvents,
      workflowExecutions,
    };
  }

  return {
    logging,
    metrics,
    tracing,
    alerts,

    async getSystemHealth(context: EnterpriseContext) {
      const { context: ctx } = await authorize(context);
      const started = Date.now();
      const span = tracing.start({
        tenantId: ctx.tenantId,
        module: "observability",
        action: "getSystemHealth",
        correlationId: ctx.correlationId,
        requestId: ctx.requestId,
      });
      try {
        const result = await health.checkAll(ctx.tenantId, ctx.userId);
        metrics.recordRequest(
          ctx.tenantId,
          "server_actions",
          Date.now() - started,
          "ok",
          { kind: "server_action", action: "getSystemHealth" },
        );
        logging.log({
          tenantId: ctx.tenantId,
          module: "observability",
          action: "getSystemHealth",
          actor: ctx.userId,
          severity: "info",
          correlationId: span.correlationId,
          duration: Date.now() - started,
          status: "ok",
          metadata: { health: result.status },
        });
        tracing.end(span.traceId, "ok");
        return result;
      } catch (error) {
        tracing.end(span.traceId, "error");
        throw error;
      }
    },

    async getMetrics(
      context: EnterpriseContext,
      filters: ObservabilityFilters = {},
    ) {
      const { context: ctx } = await authorize(context);
      const counters = await collectCounters(ctx.tenantId);

      const snap = metrics.snapshot(ctx.tenantId, {
        workflowExecutions: counters.workflowExecutions,
        approvals: counters.approvals,
        notifications: counters.notifications,
        timelineEvents: counters.timelineEvents,
        outboxPending: counters.outboxPending,
        outboxFailed: counters.outboxFailed,
      });
      // filtros reservados para agregações futuras (módulo/serviço/período)
      if (filters.service && snap.byService[filters.service]) {
        const svc = snap.byService[filters.service]!;
        return {
          ...snap,
          requests: svc.requests,
          errors: svc.errors,
          latency: svc.latency,
        };
      }
      return snap;
    },

    async getAlerts(
      context: EnterpriseContext,
      filters: ObservabilityFilters = {},
    ) {
      const { context: ctx } = await authorize(context);
      const healthSnap = await health.checkAll(ctx.tenantId, ctx.userId);
      const counters = await collectCounters(ctx.tenantId);
      const metricsSnap = metrics.snapshot(ctx.tenantId, {
        workflowExecutions: counters.workflowExecutions,
        approvals: counters.approvals,
        notifications: counters.notifications,
        timelineEvents: counters.timelineEvents,
        outboxPending: counters.outboxPending,
        outboxFailed: counters.outboxFailed,
      });
      alerts.evaluate({
        tenantId: ctx.tenantId,
        health: healthSnap,
        metrics: metricsSnap,
        workflowBlocked: counters.workflowBlocked,
        approvalsExpired: counters.approvalsExpired,
        notificationsFailed: counters.notificationsFailed,
      });
      return alerts.list(ctx.tenantId, filters);
    },

    async getTrace(
      context: EnterpriseContext,
      traceId: string,
    ): Promise<TraceSpan> {
      const { context: ctx } = await authorize(context);
      if (!traceId?.trim()) {
        throw new ObservabilityError(
          "traceId obrigatório.",
          OBSERVABILITY_ERROR_CODES.VALIDATION_FAILED,
        );
      }
      const span = tracing.getTrace(traceId);
      if (!span || (span.tenantId && span.tenantId !== ctx.tenantId)) {
        throw new ObservabilityError(
          "Trace não encontrado.",
          OBSERVABILITY_ERROR_CODES.NOT_FOUND,
        );
      }
      return span;
    },

    async snapshot(
      context: EnterpriseContext,
      filters: ObservabilityFilters = {},
    ): Promise<ObservabilitySnapshot> {
      const { context: ctx } = await authorize(context);
      const healthSnap = await health.checkAll(ctx.tenantId, ctx.userId);
      const counters = await collectCounters(ctx.tenantId);
      const metricsSnap = metrics.snapshot(ctx.tenantId, {
        workflowExecutions: counters.workflowExecutions,
        approvals: counters.approvals,
        notifications: counters.notifications,
        timelineEvents: counters.timelineEvents,
        outboxPending: counters.outboxPending,
        outboxFailed: counters.outboxFailed,
      });
      alerts.evaluate({
        tenantId: ctx.tenantId,
        health: healthSnap,
        metrics: metricsSnap,
        workflowBlocked: counters.workflowBlocked,
        approvalsExpired: counters.approvalsExpired,
        notificationsFailed: counters.notificationsFailed,
      });
      const alertList = alerts.list(ctx.tenantId, filters);
      return {
        health: healthSnap,
        metrics: metricsSnap,
        alerts: alertList,
        kpis: status.toKpis(healthSnap, metricsSnap),
        traces: tracing.list(ctx.tenantId, filters).slice(0, 20),
      };
    },

    async diagnostics(context: EnterpriseContext) {
      const snap = await this.snapshot(context);
      return diagnostics.build({
        tenantId: context.tenantId,
        health: snap.health,
        metrics: snap.metrics,
        alerts: snap.alerts,
      });
    },
  };
}

export type ObservabilityService = ReturnType<typeof createObservabilityService>;
