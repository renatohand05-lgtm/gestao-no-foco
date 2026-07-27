/**
 * Sprint 21.5 — Tipos centrais da Notification Platform Enterprise.
 * Domínio puro · orientado a eventos · sem React · sem I/O externo.
 */

export type NotificationChannelId =
  | "in_app"
  | "inbox"
  | "email"
  | "push"
  | "webhook"
  | "sms_placeholder";

export type NotificationCategoryId =
  | "system"
  | "security"
  | "approval"
  | "workflow"
  | "finance"
  | "purchases"
  | "inventory"
  | "sales"
  | "crm"
  | "service_orders"
  | "users"
  | "reports"
  | "dashboard"
  | "configuration"
  | "audit";

export type NotificationPriorityId =
  | "low"
  | "normal"
  | "high"
  | "urgent"
  | "critical";

export type NotificationStatusId =
  | "created"
  | "queued"
  | "scheduled"
  | "processing"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "cancelled"
  | "expired"
  | "suppressed"
  | "deduplicated";

export type NotificationTenantScope = "global" | "tenant";

export type DeduplicationMode =
  | "suppress"
  | "merge"
  | "replace"
  | "allow";

export type RetryBackoffStrategy = "none" | "fixed" | "linear" | "exponential";

export type NotificationAction = {
  id: string;
  label: string;
  href?: string | null;
  type?: "link" | "primary" | "secondary" | "dismiss";
  metadata?: Record<string, unknown>;
};

export type NotificationMetadata = Record<string, unknown>;

export type NotificationRecipientKind =
  | "user"
  | "role"
  | "permission"
  | "team"
  | "tenant"
  | "email"
  | "device"
  | "dynamic";

export type NotificationRecipient = {
  id: string;
  kind: NotificationRecipientKind;
  userId?: string | null;
  role?: string | null;
  permission?: string | null;
  teamId?: string | null;
  email?: string | null;
  deviceId?: string | null;
  resolverKey?: string | null;
  metadata?: NotificationMetadata;
};

export type NotificationPreference = {
  userId: string | null;
  tenantId: string | null;
  enabledChannels: readonly NotificationChannelId[];
  blockedCategories: readonly NotificationCategoryId[];
  minPriority: NotificationPriorityId;
  quietHoursStart?: number | null; // 0-23
  quietHoursEnd?: number | null;
  timezone?: string | null;
  locale?: string | null;
  frequency?: "realtime" | "digest_hourly" | "digest_daily" | "off";
  digestEnabled?: boolean;
  optOut?: boolean;
  mandatoryChannels?: readonly NotificationChannelId[];
  metadata?: NotificationMetadata;
};

export type NotificationTemplate = {
  id: string;
  version: string;
  event: string;
  category: NotificationCategoryId;
  tenantScope: NotificationTenantScope;
  tenantId?: string | null;
  supportedChannels: readonly NotificationChannelId[];
  titleTemplate: string;
  messageTemplate: string;
  variablesSchema: readonly string[];
  fallbacks?: Record<string, string>;
  actions?: readonly NotificationAction[];
  metadata?: NotificationMetadata;
};

export type NotificationEventDefinition = {
  code: string;
  label: string;
  description: string;
  defaultCategory: NotificationCategoryId;
  defaultPriority: NotificationPriorityId;
  defaultChannels: readonly NotificationChannelId[];
  mandatory?: boolean;
};

export type NotificationDefinition = {
  id: string;
  version: string;
  name: string;
  description: string;
  event: string;
  category: NotificationCategoryId;
  priority: NotificationPriorityId;
  channels: readonly NotificationChannelId[];
  templateId: string;
  tenantScope: NotificationTenantScope;
  tenantId?: string | null;
  mandatory?: boolean;
  deduplicationMode?: DeduplicationMode;
  deduplicationWindowMinutes?: number;
  metadata?: NotificationMetadata;
};

export type NotificationContext = {
  tenantId: string | null;
  userId: string | null;
  roles: readonly string[];
  permissions: readonly string[];
  locale?: string | null;
  timezone?: string | null;
  correlationId: string | null;
  requestId: string | null;
  source?: string | null;
  nowHour?: number | null; // 0-23 for quiet hours evaluation
  variables: Record<string, unknown>;
  metadata: NotificationMetadata;
};

export type NotificationRequest = {
  id: string;
  tenantId: string;
  event: string;
  category: NotificationCategoryId;
  priority: NotificationPriorityId;
  channels: readonly NotificationChannelId[];
  recipients: readonly NotificationRecipient[];
  templateId: string | null;
  variables: Record<string, unknown>;
  title: string | null;
  message: string | null;
  actions: readonly NotificationAction[];
  metadata: NotificationMetadata;
  source: string | null;
  correlationId: string | null;
  requestId: string | null;
  scheduledAt: string | null;
  expiresAt: string | null;
  deduplicationKey: string | null;
  deduplicationMode: DeduplicationMode;
  mandatory: boolean;
  createdAt: string;
};

export type NotificationDeliveryAttempt = {
  id: string;
  channel: NotificationChannelId;
  recipientId: string;
  attempt: number;
  maxAttempts: number;
  retryable: boolean;
  retryAfterMinutes: number | null;
  backoffStrategy: RetryBackoffStrategy;
  status: NotificationStatusId;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
};

export type NotificationHistoryEntry = {
  id: string;
  at: string;
  type:
    | "created"
    | "routed"
    | "rendered"
    | "queued"
    | "dispatched"
    | "delivered"
    | "failed"
    | "retried"
    | "read"
    | "cancelled"
    | "expired"
    | "deduplicated"
    | "suppressed";
  channel?: NotificationChannelId | null;
  recipientId?: string | null;
  message?: string | null;
  metadata?: NotificationMetadata;
};

export type NotificationPendingAction = {
  id: string;
  type:
    | "WRITE_AUDIT_EVENT"
    | "SEND_EMAIL"
    | "SEND_PUSH"
    | "SEND_WEBHOOK"
    | "SEND_SMS"
    | "CREATE_INBOX"
    | "CREATE_IN_APP";
  description: string;
  payload: Record<string, unknown>;
  notificationId: string;
  tenantId: string;
  createdAt: string;
};

export type NotificationAuditIntent = {
  event: string;
  notificationId: string;
  tenantId: string;
  channels: readonly NotificationChannelId[];
  recipientCount: number;
  correlationId: string | null;
  metadata: NotificationMetadata;
};

export type NotificationResult = {
  ok: boolean;
  status: NotificationStatusId;
  reason: string;
  request: NotificationRequest;
  renderedTitle: string | null;
  renderedMessage: string | null;
  routedChannels: readonly NotificationChannelId[];
  resolvedRecipients: readonly NotificationRecipient[];
  attempts: readonly NotificationDeliveryAttempt[];
  history: readonly NotificationHistoryEntry[];
  pendingActions: readonly NotificationPendingAction[];
  auditIntent: NotificationAuditIntent | null;
  suppressed: boolean;
  deduplicated: boolean;
  explanation: string[];
};

export type NotificationAdapterResult = {
  ok: boolean;
  channel: NotificationChannelId;
  status: NotificationStatusId;
  message: string;
  simulated: true;
  payload?: Record<string, unknown>;
};

export type NotificationAdapter = {
  channel: NotificationChannelId;
  dispatch: (input: {
    request: NotificationRequest;
    recipient: NotificationRecipient;
    title: string;
    message: string;
  }) => NotificationAdapterResult;
};

export type NotificationValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type NotificationValidationResult = {
  valid: boolean;
  issues: readonly NotificationValidationIssue[];
};
