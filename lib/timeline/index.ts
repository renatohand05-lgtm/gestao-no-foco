/**
 * Sprint 21.8 — Enterprise Activity Timeline · API pública.
 * Domínio de visualização — sem React · sem SQL · sem mutação de engines.
 */

export type {
  TimelineActor,
  TimelineDashboardKpis,
  TimelineDetails,
  TimelineEntityType,
  TimelineEvent,
  TimelineFilters,
  TimelineGroup,
  TimelineGroupBy,
  TimelinePage,
  TimelinePagination,
  TimelineSeverity,
  TimelineSource,
} from "./timeline-types.ts";

export {
  TIMELINE_DEFAULT_LIMIT,
  TIMELINE_MAX_LIMIT,
} from "./timeline-types.ts";

export {
  TIMELINE_ERROR_CODES,
  TimelineError,
  isTimelineError,
  type TimelineErrorCode,
} from "./timeline-errors.ts";

export {
  TIMELINE_READ_PERMISSIONS,
  hasTimelineReadPermission,
  mergeTimelineContext,
  type TimelineAuthorizationSnapshot,
} from "./timeline-context.ts";

export {
  assertTimelineActor,
  assertTimelineReadPermission,
  assertTimelineTenant,
} from "./timeline-validator.ts";

export {
  dedupeTimelineEvents,
  mapApprovalDecisionToTimelineEvent,
  mapApprovalRequestToTimelineEvent,
  mapAuditToTimelineEvent,
  mapNotificationToTimelineEvent,
  mapOutboxToTimelineEvent,
  mapWorkflowHistoryToTimelineEvent,
  sortTimelineEvents,
} from "./timeline-mappers.ts";

export {
  filterTimelineEvents,
  groupTimelineEvents,
  matchesTimelineSearch,
  normalizePagination,
  paginateTimelineEvents,
} from "./timeline-filters.ts";

export {
  aggregateTimelineEvents,
  loadRelatedByCorrelation,
  type TimelineQueryDeps,
} from "./timeline-query.ts";

export {
  createTimelineService,
  type TimelineService,
  type TimelineServiceDeps,
} from "./timeline-service.ts";

export {
  buildTimelineDeepLink,
  applyTimelineDeepLinks,
  normalizeEntityTypeForLink,
  type TimelineDeepLinkInput,
} from "./timeline-links.ts";

export {
  enrichTimelineActors,
  type TimelineActorProfile,
  type ResolveActorProfile,
} from "./timeline-enrichment.ts";
