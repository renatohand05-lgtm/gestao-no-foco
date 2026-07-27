/**
 * Sprint 21.9 — Health Service.
 * Probes read-only sobre adapters existentes · sem alterar engines.
 */

import type {
  ApprovalRepository,
  AuditRepository,
  NotificationRepository,
  OutboxRepository,
  WorkflowRepository,
} from "../enterprise/repositories/contracts.ts";
import type {
  ObservabilityHealthStatus,
  ObservabilityServiceName,
  ServiceHealth,
  SystemHealth,
} from "./observability-types.ts";

export type HealthProbeResult = {
  ok: boolean;
  latencyMs: number;
  message?: string | null;
};

export type HealthServiceDeps = {
  audit?: Pick<AuditRepository, "list">;
  workflow?: Pick<WorkflowRepository, "listInstances">;
  approval?: Pick<ApprovalRepository, "listRequests">;
  notification?: Pick<NotificationRepository, "listForUser">;
  outbox?: Pick<OutboxRepository, "countByStatus">;
  probeDatabase?: () => Promise<HealthProbeResult>;
  probeSupabase?: () => Promise<HealthProbeResult>;
  probeStorage?: () => Promise<HealthProbeResult>;
};

async function timed(
  fn: () => Promise<void>,
): Promise<HealthProbeResult> {
  const started = Date.now();
  try {
    await fn();
    return { ok: true, latencyMs: Date.now() - started, message: "ok" };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      message: error instanceof Error ? error.message : "probe_failed",
    };
  }
}

function toStatus(ok: boolean, latencyMs: number): ObservabilityHealthStatus {
  if (!ok) return "unhealthy";
  if (latencyMs > 2000) return "degraded";
  return "healthy";
}

function service(
  name: ObservabilityServiceName,
  probe: HealthProbeResult,
): ServiceHealth {
  return {
    name,
    status: toStatus(probe.ok, probe.latencyMs),
    latencyMs: probe.latencyMs,
    message: probe.message ?? null,
    checkedAt: new Date().toISOString(),
  };
}

export function createHealthService(deps: HealthServiceDeps = {}) {
  return {
    async checkAll(
      tenantId: string,
      viewerUserId?: string | null,
    ): Promise<SystemHealth> {
      if (!tenantId?.trim()) {
        return {
          status: "unknown",
          checkedAt: new Date().toISOString(),
          tenantId: "",
          services: [],
          availabilityPct: 0,
        };
      }

      const services: ServiceHealth[] = [];

      const db = deps.probeDatabase
        ? await deps.probeDatabase()
        : deps.audit
          ? await timed(async () => {
              const auditRepo = deps.audit!;
              await auditRepo.list(tenantId, { limit: 1 });
            })
          : { ok: true, latencyMs: 0, message: "skipped" };
      services.push(service("database", db));

      const supabase = deps.probeSupabase
        ? await deps.probeSupabase()
        : { ok: true, latencyMs: 0, message: "skipped" };
      services.push(service("supabase", supabase));

      const workflowRepo = deps.workflow;
      const workflow = workflowRepo
        ? await timed(async () => {
            await workflowRepo.listInstances(tenantId);
          })
        : { ok: true, latencyMs: 0, message: "skipped" };
      services.push(service("workflow", workflow));

      const approvalRepo = deps.approval;
      const approval =
        approvalRepo?.listRequests
          ? await timed(async () => {
              await approvalRepo.listRequests!({
                tenantId,
                page: 1,
                limit: 1,
                orderBy: "createdAt",
                orderDir: "desc",
              });
            })
          : { ok: true, latencyMs: 0, message: "skipped" };
      services.push(service("approval", approval));

      // Timeline depende de Audit (read-only) — não altera Timeline
      const auditRepo = deps.audit;
      const timeline = auditRepo
        ? await timed(async () => {
            await auditRepo.list(tenantId, { limit: 1 });
          })
        : { ok: true, latencyMs: 0, message: "skipped" };
      services.push(service("timeline", timeline));

      const notificationRepo = deps.notification;
      const notifications =
        notificationRepo && viewerUserId
          ? await timed(async () => {
              await notificationRepo.listForUser(tenantId, viewerUserId);
            })
          : { ok: true, latencyMs: 0, message: viewerUserId ? "skipped" : "no_viewer" };
      services.push(service("notifications", notifications));

      const outboxRepo = deps.outbox;
      const outbox = outboxRepo
        ? await timed(async () => {
            await outboxRepo.countByStatus(tenantId, "pending");
          })
        : { ok: true, latencyMs: 0, message: "skipped" };
      services.push(service("outbox", outbox));

      const storage = deps.probeStorage
        ? await deps.probeStorage()
        : {
            ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
            latencyMs: 0,
            message: process.env.NEXT_PUBLIC_SUPABASE_URL
              ? "env_present"
              : "env_missing",
          };
      services.push(service("storage", storage));

      // Se esta checagem rodou via server action, o próprio runtime está ok
      services.push(
        service("server_actions", {
          ok: true,
          latencyMs: 0,
          message: "ok",
        }),
      );

      const scored = services.filter((s) => s.message !== "skipped");
      const healthy = scored.filter((s) => s.status === "healthy").length;
      const availabilityPct =
        scored.length === 0
          ? 100
          : Math.round((healthy / scored.length) * 1000) / 10;

      let status: ObservabilityHealthStatus = "healthy";
      if (services.some((s) => s.status === "unhealthy")) status = "unhealthy";
      else if (services.some((s) => s.status === "degraded")) status = "degraded";

      return {
        status,
        checkedAt: new Date().toISOString(),
        tenantId,
        services,
        availabilityPct,
      };
    },
  };
}

export type HealthService = ReturnType<typeof createHealthService>;
