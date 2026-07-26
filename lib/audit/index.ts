/**
 * Sprint 21.2 — Audit Platform Enterprise · API pública.
 * Domínio puro · sem React · sem SQL · sem I/O de arquivos.
 *
 * Preparado para RBAC futuro:
 *   import { audit } from "@/lib/audit";
 *   audit.log(ctx, { event: "PERMISSION_DENIED", ... });
 */

export type {
  ActorType,
  AuditContext,
  AuditErrorCode,
  AuditEvent,
  AuditExportFormat,
  AuditExportResult,
  AuditLogInput,
  AuditMetadata,
  AuditMetadataValue,
  AuditOrigin,
  AuditRecordResult,
  AuditSink,
  AuditTargetType,
  AuditTimelineGroup,
  AuditTimelineGroupBy,
} from "./types.ts";

export {
  AUDIT_EVENT_BY_CODE,
  AUDIT_EVENT_CATALOG,
  AUDIT_EVENT_CODES,
  getAuditEventDefinition,
  isKnownAuditEvent,
  listAuditEvents,
  type AuditEventCode,
  type AuditEventDefinition,
} from "./events.ts";

export {
  AUDIT_CATEGORIES,
  AUDIT_CATEGORY_BY_ID,
  AUDIT_CATEGORY_CATALOG,
  getAuditCategory,
  isKnownAuditCategory,
  listAuditCategories,
  type AuditCategoryId,
  type AuditCategoryMeta,
} from "./categories.ts";

export {
  AUDIT_SEVERITIES,
  AUDIT_SEVERITY_BY_ID,
  AUDIT_SEVERITY_CATALOG,
  compareAuditSeverity,
  getAuditSeverity,
  isKnownAuditSeverity,
  listAuditSeverities,
  type AuditSeverityId,
  type AuditSeverityMeta,
} from "./severity.ts";

export {
  ACTOR_CATALOG,
  ACTOR_TYPES,
  isKnownActorType,
  normalizeActorType,
  resolveActorType,
  type ActorMeta,
} from "./actors.ts";

export {
  AUDIT_TARGET_TYPES,
  inferTargetTypeFromEvent,
  isKnownTargetType,
  normalizeTargetType,
} from "./targets.ts";

export {
  isEmptyMetadata,
  mergeMetadata,
  normalizeMetadata,
} from "./metadata.ts";

export {
  formatAuditActor,
  formatAuditEventLine,
  formatAuditEventSummary,
  formatAuditEventTitle,
  formatAuditTarget,
  formatAuditTimestamp,
} from "./formatter.ts";

export {
  __resetAuditRecorderSeqForTests,
  recordAuditEvent,
} from "./recorder.ts";

export {
  AuditLogger,
  audit,
  createAuditLogger,
  type AuditLoggerOptions,
} from "./logger.ts";

export {
  assertSameTenant,
  createAuditContext,
  isValidAuditContext,
  withCorrelation,
  withRequest,
  type CreateAuditContextInput,
} from "./context.ts";

export {
  filterAuditEvents,
  filterByTenant,
  matchesAuditFilter,
  type AuditFilterCriteria,
} from "./filters.ts";

export {
  buildAuditTimeline,
  eventsByCategory,
  eventsByModule,
  eventsBySeverity,
  eventsByTenant,
  eventsByUser,
  groupAuditEvents,
  latestAuditEvents,
  sortAuditEvents,
} from "./timeline.ts";

export {
  findByCorrelationId,
  findByRequestId,
  searchAuditEvents,
  type AuditSearchQuery,
} from "./search.ts";

export { exportAuditEvents } from "./exporter.ts";
