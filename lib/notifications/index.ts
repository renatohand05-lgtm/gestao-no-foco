/**
 * Sprint 21.5 — Notification Platform Enterprise · API pública.
 */

export type {
  DeduplicationMode,
  NotificationAction,
  NotificationAdapter,
  NotificationAdapterResult,
  NotificationAuditIntent,
  NotificationCategoryId,
  NotificationChannelId,
  NotificationContext,
  NotificationDefinition,
  NotificationDeliveryAttempt,
  NotificationEventDefinition,
  NotificationHistoryEntry,
  NotificationMetadata,
  NotificationPendingAction,
  NotificationPreference,
  NotificationPriorityId,
  NotificationRecipient,
  NotificationRecipientKind,
  NotificationRequest,
  NotificationResult,
  NotificationStatusId,
  NotificationTemplate,
  NotificationTenantScope,
  NotificationValidationIssue,
  NotificationValidationResult,
  RetryBackoffStrategy,
} from "./types.ts";

export {
  CHANNEL_CATALOG,
  CRITICAL_CHANNEL_ORDER,
  NORMAL_CHANNEL_ORDER,
  NOTIFICATION_CHANNELS,
  isKnownChannel,
} from "./channels.ts";

export {
  MANDATORY_CATEGORIES,
  NOTIFICATION_CATEGORIES,
  isKnownCategory,
} from "./categories.ts";

export {
  NOTIFICATION_PRIORITIES,
  PRIORITY_RANK,
  comparePriority,
  isKnownPriority,
  meetsMinPriority,
} from "./priorities.ts";

export {
  NOTIFICATION_EVENT_BY_CODE,
  NOTIFICATION_EVENT_CATALOG,
  NOTIFICATION_EVENT_CODES,
  getNotificationEvent,
  isKnownNotificationEvent,
  type NotificationEventCode,
} from "./events.ts";

export { NOTIFICATION_STATUSES, isKnownStatus } from "./notification.ts";

export {
  NOTIFICATION_ERROR_CODES,
  InvalidNotificationRequestError,
  NotificationError,
  NotificationTemplateError,
  isNotificationError,
  type NotificationErrorCode,
} from "./notification-errors.ts";

export {
  clearTemplates,
  createDefaultTemplates,
  ensureDefaultTemplates,
  getTemplate,
  getTemplateForTenant,
  listTemplates,
  registerTemplate,
  templateKey,
} from "./templates.ts";

export {
  renderNotificationTemplate,
  renderTemplateString,
} from "./template-renderer.ts";

export {
  createNotificationContext,
  isValidNotificationContext,
  type CreateNotificationContextInput,
} from "./notification-context.ts";

export {
  createRecipient,
  isValidRecipient,
  normalizeRecipients,
} from "./notification-recipient.ts";

export {
  createPreference,
  evaluatePreferences,
  isCategoryBlocked,
  type PreferenceEvalResult,
} from "./notification-preferences.ts";

export {
  __resetNotificationSeqForTests,
  createNotificationRequest,
  type CreateNotificationRequestInput,
} from "./notification-request.ts";

export { validateNotificationRequest } from "./notification-validation.ts";

export {
  applyDeduplicationToResult,
  buildDeduplicationKey,
  clearDeduplicationMemory,
  evaluateDeduplication,
  rememberNotification,
  type DedupeEval,
} from "./notification-deduplication.ts";

export {
  computeRetryAfterMinutes,
  createDeliveryAttempt,
  type RetryConfig,
} from "./notification-retry.ts";

export {
  __resetHistorySeqForTests,
  appendHistory,
  createHistoryEntry,
  freezeHistory,
} from "./notification-history.ts";

export {
  filterHistory,
  groupHistoryByChannel,
  sortHistory,
  timelineFromResult,
  type TimelineFilter,
} from "./notification-timeline.ts";

export {
  getAvailableChannels,
  routeNotification,
  type RouteResult,
} from "./notification-router.ts";

export {
  DEFAULT_ADAPTERS,
  EmailNotificationAdapter,
  InAppNotificationAdapter,
  InboxNotificationAdapter,
  PushNotificationAdapter,
  SmsPlaceholderAdapter,
  WebhookNotificationAdapter,
  getAdapterMap,
} from "./adapters.ts";

export {
  dispatchNotification,
  type DispatchInput,
  type DispatchOutput,
} from "./notification-dispatcher.ts";

export {
  __resetPendingActionSeqForTests,
  createAuditIntent,
  createPendingAction,
  emptyResult,
} from "./notification-result.ts";

export {
  canNotify,
  cannotNotify,
  createNotification,
  dispatchNotificationOnly,
  evaluateNotification,
  explainNotification,
  getRecipients,
  notify,
  renderNotification,
  routeNotificationOnly,
  type EvaluateOptions,
} from "./notification-engine.ts";

export {
  notificationFromApprovalAction,
  notificationFromAuditEvent,
  notificationFromSecurityDecision,
  notificationFromWorkflowAction,
  type ApprovalActionSnapshot,
  type AuditEventSnapshot,
  type SecurityDecisionSnapshot,
  type WorkflowActionSnapshot,
} from "./bridges.ts";

export {
  NotificationRegistry,
  notificationRegistry,
} from "./notification-registry.ts";

export {
  deserializeNotificationRequest,
  deserializeNotificationResult,
  serializeNotificationRequest,
  serializeNotificationResult,
} from "./notification-serializer.ts";
