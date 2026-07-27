/**
 * Sprint 21.6 — Health snapshot da camada Enterprise.
 */

import { nowIso } from "./mappers.ts";
import type { EnterpriseHealthSnapshot, EnterpriseHealthStatus } from "./types.ts";
import type { MemoryEnterpriseKit } from "./repositories/memory.ts";
import type { OutboxRepository } from "./repositories/outbox-repository.ts";
import type { WorkflowRepository } from "./repositories/workflow-repository.ts";
import type { IdempotencyRepository } from "./repositories/idempotency-repository.ts";

export type HealthDeps = {
  tenantId: string;
  outbox: OutboxRepository;
  workflow?: WorkflowRepository;
  idempotency?: IdempotencyRepository;
  /** Quando usando memory kit, métricas extras. */
  memory?: MemoryEnterpriseKit["store"];
  databaseConnected?: boolean;
  databaseMessage?: string;
};

export async function getEnterpriseHealth(
  deps: HealthDeps,
): Promise<EnterpriseHealthSnapshot> {
  const pending = await deps.outbox.countByStatus(deps.tenantId, "pending");
  const failed = await deps.outbox.countByStatus(deps.tenantId, "failed");
  const processing = await deps.outbox.countByStatus(
    deps.tenantId,
    "processing",
  );
  const dead = await deps.outbox.countByStatus(deps.tenantId, "dead");

  let workflowsBlocked = 0;
  if (deps.workflow) {
    const blocked = await deps.workflow.listInstances(deps.tenantId, {
      status: "blocked",
    });
    workflowsBlocked = blocked.length;
  }

  const approvalsExpired = deps.memory
    ? deps.memory.approvalRequests.filter(
        (r) => r.tenantId === deps.tenantId && r.status === "expired",
      ).length
    : 0;

  const notificationsFailed = deps.memory
    ? deps.memory.notifications.filter(
        (n) => n.tenantId === deps.tenantId && n.status === "failed",
      ).length
    : 0;

  const auditWriteFailures = deps.memory?.auditWriteFailures ?? 0;
  const idempotencyConflicts = deps.idempotency
    ? await deps.idempotency.countConflicts(deps.tenantId)
    : (deps.memory?.idempotencyConflicts ?? 0);

  const details: string[] = [];
  if (pending > 50) details.push("outbox_pending_high");
  if (failed + dead > 0) details.push("outbox_failures");
  if (workflowsBlocked > 0) details.push("workflows_blocked");
  if (idempotencyConflicts > 0) details.push("idempotency_conflicts");

  const dbConnected = deps.databaseConnected !== false;
  let status: EnterpriseHealthStatus = "healthy";
  if (!dbConnected) status = "unhealthy";
  else if (failed + dead > 0 || auditWriteFailures > 0) status = "degraded";
  else if (pending > 100) status = "degraded";

  return {
    status,
    checkedAt: nowIso(),
    database: {
      connected: dbConnected,
      message: deps.databaseMessage ?? (dbConnected ? "ok" : "unavailable"),
    },
    outbox: { pending, failed: failed + dead, processing },
    workflows: { blocked: workflowsBlocked },
    approvals: { expired: approvalsExpired },
    notifications: { failed: notificationsFailed },
    audit: { writeFailures: auditWriteFailures },
    idempotency: { conflicts: idempotencyConflicts },
    details,
  };
}
