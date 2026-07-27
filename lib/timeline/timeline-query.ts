/**
 * Sprint 21.8 — Query / agregação de fontes Enterprise (read-only).
 * RC1: histórico workflow completo · enrichment · deep links · outbox tenant-scoped.
 */

import type {
  ApprovalRepository,
  AuditRepository,
  NotificationRepository,
  PersistedWorkflowInstance,
  WorkflowRepository,
} from "../enterprise/repositories/contracts.ts";
import type { EnterpriseOutboxEvent } from "../enterprise/types.ts";
import {
  enrichTimelineActors,
  type ResolveActorProfile,
} from "./timeline-enrichment.ts";
import { applyTimelineDeepLinks } from "./timeline-links.ts";
import {
  dedupeTimelineEvents,
  mapApprovalDecisionToTimelineEvent,
  mapApprovalRequestToTimelineEvent,
  mapAuditToTimelineEvent,
  mapNotificationToTimelineEvent,
  mapOutboxToTimelineEvent,
  mapWorkflowHistoryToTimelineEvent,
  sortTimelineEvents,
} from "./timeline-mappers.ts";
import type { TimelineEvent, TimelineFilters } from "./timeline-types.ts";

export type TimelineQueryDeps = {
  audit: Pick<
    AuditRepository,
    "list" | "listByTarget" | "listByCorrelationId" | "findById" | "search"
  >;
  workflow?: Pick<WorkflowRepository, "listInstances" | "listHistory" | "getInstance">;
  approval?: Pick<
    ApprovalRepository,
    "listDecisions" | "listRequests" | "getRequest"
  >;
  notification?: Pick<NotificationRepository, "listForUser">;
  /**
   * Read-only outbox listing (SELECT autenticado · RLS · sem claimBatch).
   * Deve filtrar obrigatoriamente por tenantId.
   */
  listOutbox?: (tenantId: string, limit?: number) => Promise<EnterpriseOutboxEvent[]>;
  resolveActorProfile?: ResolveActorProfile;
  /** Prefixo de deep links (`/[tenant]/...`). */
  tenantSlug?: string | null;
};

const FETCH_LIMIT = 80;
const WORKFLOW_INSTANCE_CAP = 30;
const APPROVAL_CAP = 40;
const NOTIFICATION_CAP = 40;
const OUTBOX_CAP = 40;

async function loadWorkflowEvents(
  deps: TimelineQueryDeps,
  tenantId: string,
  filters: TimelineFilters,
): Promise<TimelineEvent[]> {
  if (!deps.workflow) return [];

  const events: TimelineEvent[] = [];

  try {
    // Histórico de uma instância específica (completo, sem erro se ausente)
    if (
      (filters.entityType === "workflow" ||
        filters.entityType === "workflow_instance") &&
      filters.entityId
    ) {
      const inst =
        (await deps.workflow.getInstance?.(tenantId, filters.entityId)) ?? null;
      if (!inst || inst.tenantId !== tenantId) return [];
      try {
        const hist = await deps.workflow.listHistory(tenantId, inst.id);
        for (const h of hist) {
          events.push(mapWorkflowHistoryToTimelineEvent(h, inst));
        }
      } catch {
        // sem histórico global / falha pontual → retorna o que houver
      }
      return events;
    }

    const instances = await deps.workflow.listInstances(tenantId);
    const limited = instances
      .filter((i) => i.tenantId === tenantId)
      .slice(0, WORKFLOW_INSTANCE_CAP);

    const histories = await Promise.all(
      limited.map(async (inst) => {
        try {
          const hist = await deps.workflow!.listHistory(tenantId, inst.id);
          return { inst, hist };
        } catch {
          return { inst, hist: [] as Awaited<
            ReturnType<NonNullable<TimelineQueryDeps["workflow"]>["listHistory"]>
          > };
        }
      }),
    );

    for (const { inst, hist } of histories) {
      // histórico completo da instância quando disponível
      for (const h of hist) {
        events.push(mapWorkflowHistoryToTimelineEvent(h, inst));
      }
    }
  } catch {
    return events;
  }

  return events;
}

export async function aggregateTimelineEvents(
  deps: TimelineQueryDeps,
  tenantId: string,
  filters: TimelineFilters = {},
  viewerUserId?: string | null,
): Promise<TimelineEvent[]> {
  if (!tenantId?.trim()) return [];

  const collected: TimelineEvent[] = [];

  const auditRows =
    filters.entityType && filters.entityId
      ? await deps.audit.listByTarget(
          tenantId,
          filters.entityType,
          filters.entityId,
        )
      : await deps.audit.list(tenantId, { limit: FETCH_LIMIT });

  for (const row of auditRows) {
    if (row.tenantId !== tenantId) continue;
    collected.push(mapAuditToTimelineEvent(row));
  }

  collected.push(...(await loadWorkflowEvents(deps, tenantId, filters)));

  if (deps.approval?.listRequests) {
    const listed = await deps.approval.listRequests({
      tenantId,
      status: filters.status ?? null,
      page: 1,
      limit: APPROVAL_CAP,
      orderBy: "createdAt",
      orderDir: "desc",
    });
    // decisões em paralelo (evita N+1 sequencial)
    const decisionBundles = await Promise.all(
      listed.items
        .filter((req) => req.tenantId === tenantId)
        .map(async (req) => {
          const decisions = await deps.approval!.listDecisions(tenantId, req.id);
          return { req, decisions };
        }),
    );
    for (const { req, decisions } of decisionBundles) {
      collected.push(mapApprovalRequestToTimelineEvent(req));
      for (const d of decisions) {
        collected.push(mapApprovalDecisionToTimelineEvent(d, req));
      }
    }
  }

  if (deps.notification && viewerUserId) {
    const notes = await deps.notification.listForUser(tenantId, viewerUserId);
    for (const n of notes.slice(0, NOTIFICATION_CAP)) {
      if (n.tenantId !== tenantId) continue;
      collected.push(mapNotificationToTimelineEvent(n));
    }
  }

  if (deps.listOutbox) {
    const outbox = await deps.listOutbox(tenantId, OUTBOX_CAP);
    for (const o of outbox) {
      // isolamento hard — nunca aceitar outbox de outro tenant
      if (o.tenantId !== tenantId) continue;
      collected.push(mapOutboxToTimelineEvent(o));
    }
  }

  let events = sortTimelineEvents(dedupeTimelineEvents(collected), "desc");
  events = applyTimelineDeepLinks(events, deps.tenantSlug);
  events = await enrichTimelineActors(events, deps.resolveActorProfile);
  return events;
}

export async function loadRelatedByCorrelation(
  deps: TimelineQueryDeps,
  tenantId: string,
  correlationId: string | null,
): Promise<{
  audit: TimelineEvent[];
  workflow: TimelineEvent[];
  approval: TimelineEvent[];
  notifications: TimelineEvent[];
}> {
  if (!correlationId) {
    return { audit: [], workflow: [], approval: [], notifications: [] };
  }

  const auditRows = await deps.audit.listByCorrelationId(
    tenantId,
    correlationId,
  );
  let audit = auditRows
    .filter((r) => r.tenantId === tenantId)
    .map(mapAuditToTimelineEvent);

  let workflow: TimelineEvent[] = [];
  if (deps.workflow) {
    try {
      const instances = await deps.workflow.listInstances(tenantId);
      const matched = instances.filter(
        (i) => i.tenantId === tenantId && i.correlationId === correlationId,
      );
      const bundles = await Promise.all(
        matched.map(async (inst: PersistedWorkflowInstance) => {
          try {
            const hist = await deps.workflow!.listHistory(tenantId, inst.id);
            return hist.map((h) => mapWorkflowHistoryToTimelineEvent(h, inst));
          } catch {
            return [] as TimelineEvent[];
          }
        }),
      );
      workflow = bundles.flat();
    } catch {
      workflow = [];
    }
  }

  audit = applyTimelineDeepLinks(audit, deps.tenantSlug);
  workflow = applyTimelineDeepLinks(workflow, deps.tenantSlug);
  audit = await enrichTimelineActors(audit, deps.resolveActorProfile);
  workflow = await enrichTimelineActors(workflow, deps.resolveActorProfile);

  const approval = audit.filter((e) => e.source === "approval");
  const notifications = audit.filter((e) => e.source === "notifications");

  return { audit, workflow, approval, notifications };
}
