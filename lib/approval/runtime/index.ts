/**
 * Sprint 21.7 — Approval Runtime · API pública.
 */

export type {
  ApprovalLevelRuntimeView,
  ApprovalRuntimeFilters,
  ApprovalRuntimeKpis,
  ApprovalRuntimeListItem,
  ApprovalRuntimeOperation,
  ApprovalRuntimeResult,
  ApprovalSlaSnapshot,
  ApprovalSlaStatus,
  ApprovalTimelineEvent,
  ApprovalTimelineEventType,
  DelegateApprovalInput,
  EscalateApprovalInput,
} from "./approval-runtime-types.ts";

export {
  APPROVAL_RUNTIME_ERROR_CODES,
  ApprovalRuntimeError,
  isApprovalRuntimeError,
  type ApprovalRuntimeErrorCode,
} from "./approval-runtime-errors.ts";

export {
  APPROVAL_RUNTIME_PERMISSIONS,
  assertRuntimePermission,
  canApprove,
  canCancel,
  canConsult,
  canDelegate,
  canEscalate,
  canReject,
  canReopen,
  hasRuntimePermission,
} from "./approval-runtime-validator.ts";

export {
  approvalContextFromEnterprise,
  mergeEnterpriseRoles,
  type AuthorizationSnapshot,
} from "./approval-runtime-context.ts";

export {
  buildApprovalAuditPayload,
  buildNotificationFromRuntime,
  mapOperationToOutboxEvent,
  type ApprovalOutboxEventType,
} from "./approval-runtime-events.ts";

export {
  buildApprovalTimeline,
  buildLevelRuntimeViews,
  computeApprovalKpis,
  computeApprovalSla,
  filterRuntimeItems,
  resolveNextStep,
  shouldEscalateBySla,
  toDomainApprovalRequest,
  toPersistedPatchFromDomain,
} from "./approval-runtime.ts";

export {
  createApprovalRuntimeService,
  type ApprovalRuntimeDeps,
  type ApprovalRuntimeService,
  type RequestApprovalRuntimeInput,
} from "./approval-runtime-service.ts";
