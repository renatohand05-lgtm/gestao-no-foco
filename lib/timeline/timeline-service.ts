/**
 * Sprint 21.8 — Timeline Service (orquestrador read-only).
 */

import type { EnterpriseContext } from "../enterprise/types.ts";
import {
  mergeTimelineContext,
  type TimelineAuthorizationSnapshot,
} from "./timeline-context.ts";
import {
  filterTimelineEvents,
  groupTimelineEvents,
  paginateTimelineEvents,
} from "./timeline-filters.ts";
import { TIMELINE_ERROR_CODES, TimelineError } from "./timeline-errors.ts";
import {
  aggregateTimelineEvents,
  loadRelatedByCorrelation,
  type TimelineQueryDeps,
} from "./timeline-query.ts";
import type {
  TimelineDashboardKpis,
  TimelineDetails,
  TimelineEvent,
  TimelineFilters,
  TimelineGroup,
  TimelineGroupBy,
  TimelinePage,
  TimelinePagination,
} from "./timeline-types.ts";
import {
  assertTimelineActor,
  assertTimelineReadPermission,
  assertTimelineTenant,
} from "./timeline-validator.ts";

export type TimelineServiceDeps = TimelineQueryDeps & {
  resolveAuthorization?: (
    context: EnterpriseContext,
  ) => Promise<TimelineAuthorizationSnapshot | null>;
  countOutboxPending?: (tenantId: string) => Promise<number>;
};

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeekIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function createTimelineService(deps: TimelineServiceDeps) {
  async function authorize(context: EnterpriseContext) {
    assertTimelineTenant(context);
    assertTimelineActor(context);
    const auth = deps.resolveAuthorization
      ? await deps.resolveAuthorization(context)
      : null;
    const merged = mergeTimelineContext(context, auth);
    assertTimelineReadPermission(auth, merged);
    return { auth, context: merged };
  }

  async function collect(
    context: EnterpriseContext,
    filters: TimelineFilters = {},
  ): Promise<TimelineEvent[]> {
    const { context: ctx } = await authorize(context);
    const events = await aggregateTimelineEvents(
      deps,
      ctx.tenantId,
      { ...filters, tenantId: ctx.tenantId },
      ctx.userId,
    );
    return filterTimelineEvents(events, {
      ...filters,
      tenantId: ctx.tenantId,
    });
  }

  function kpisFromEvents(
    events: TimelineEvent[],
    outboxPending: number,
  ): TimelineDashboardKpis {
    const today = startOfTodayIso();
    const week = startOfWeekIso();
    return {
      eventsToday: events.filter((e) => e.createdAt >= today).length,
      eventsWeek: events.filter((e) => e.createdAt >= week).length,
      criticalEvents: events.filter(
        (e) => e.severity === "critical" || e.severity === "high",
      ).length,
      approvals: events.filter((e) => e.source === "approval").length,
      alerts: events.filter(
        (e) =>
          e.severity === "critical" ||
          e.severity === "high" ||
          e.source === "notifications",
      ).length,
      workflows: events.filter((e) => e.source === "workflow").length,
      notifications: events.filter((e) => e.source === "notifications")
        .length,
      outboxPending,
    };
  }

  return {
    async queryGlobal(
      context: EnterpriseContext,
      filters: TimelineFilters = {},
      pagination: TimelinePagination = {},
    ): Promise<TimelinePage> {
      const events = await collect(context, filters);
      return paginateTimelineEvents(events, pagination);
    },

    async queryGlobalWithKpis(
      context: EnterpriseContext,
      filters: TimelineFilters = {},
      pagination: TimelinePagination = {},
    ): Promise<{ page: TimelinePage; kpis: TimelineDashboardKpis }> {
      const events = await collect(context, filters);
      const outboxPending = deps.countOutboxPending
        ? await deps.countOutboxPending(context.tenantId)
        : events.filter((e) => e.source === "outbox" && e.status === "pending")
            .length;
      return {
        page: paginateTimelineEvents(events, pagination),
        kpis: kpisFromEvents(events, outboxPending),
      };
    },

    async queryEntity(
      context: EnterpriseContext,
      entityType: string,
      entityId: string,
      filters: TimelineFilters = {},
      pagination: TimelinePagination = {},
    ): Promise<TimelinePage> {
      if (!entityType?.trim() || !entityId?.trim()) {
        throw new TimelineError(
          "entityType e entityId obrigatórios.",
          TIMELINE_ERROR_CODES.VALIDATION_FAILED,
        );
      }
      return this.queryGlobal(
        context,
        { ...filters, entityType, entityId },
        pagination,
      );
    },

    async search(
      context: EnterpriseContext,
      text: string,
      filters: TimelineFilters = {},
      pagination: TimelinePagination = {},
    ): Promise<TimelinePage> {
      return this.queryGlobal(
        context,
        { ...filters, search: text },
        pagination,
      );
    },

    async group(
      context: EnterpriseContext,
      groupBy: TimelineGroupBy,
      filters: TimelineFilters = {},
    ): Promise<TimelineGroup[]> {
      const events = await collect(context, filters);
      return groupTimelineEvents(events, groupBy);
    },

    async getDetails(
      context: EnterpriseContext,
      eventId: string,
    ): Promise<TimelineDetails> {
      const { context: ctx } = await authorize(context);
      const events = await aggregateTimelineEvents(
        deps,
        ctx.tenantId,
        {},
        ctx.userId,
      );
      const event = events.find((e) => e.id === eventId);
      if (!event || event.tenantId !== ctx.tenantId) {
        throw new TimelineError(
          "Evento não encontrado.",
          TIMELINE_ERROR_CODES.NOT_FOUND,
        );
      }

      const related = await loadRelatedByCorrelation(
        deps,
        ctx.tenantId,
        event.correlationId,
      );

      return {
        event,
        relatedAudit: related.audit.filter((e) => e.id !== event.id),
        relatedWorkflow: related.workflow,
        relatedApproval: related.approval,
        relatedNotifications: related.notifications,
        metadata: event.metadata,
      };
    },

    async dashboard(
      context: EnterpriseContext,
      filters: TimelineFilters = {},
    ): Promise<TimelineDashboardKpis> {
      const events = await collect(context, filters);
      const outboxPending = deps.countOutboxPending
        ? await deps.countOutboxPending(context.tenantId)
        : events.filter(
            (e) => e.source === "outbox" && e.status === "pending",
          ).length;
      return kpisFromEvents(events, outboxPending);
    },
  };
}

export type TimelineService = ReturnType<typeof createTimelineService>;
