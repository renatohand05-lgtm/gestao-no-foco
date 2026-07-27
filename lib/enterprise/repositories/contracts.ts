/**
 * Sprint 21.6 — Contratos de repositórios Enterprise.
 */

import type {
  EnterpriseOutboxEvent,
  IdempotencyRecord,
  JsonValue,
  OutboxEventType,
} from "../types.ts";

/* ── Audit ───────────────────────────────────────────── */

export type PersistedAuditEvent = {
  id: string;
  tenantId: string;
  userId: string | null;
  actorType: string;
  systemActorKey: string | null;
  event: string;
  category: string;
  severity: string;
  targetType: string | null;
  targetId: string | null;
  resource: string | null;
  module: string | null;
  description: string | null;
  metadata: Record<string, JsonValue>;
  origin: string | null;
  correlationId: string | null;
  requestId: string | null;
  sessionId: string | null;
  ipAddress: string | null;
  device: string | null;
  createdAt: string;
};

export type AuditRepository = {
  append(event: Omit<PersistedAuditEvent, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<PersistedAuditEvent>;
  findById(tenantId: string, id: string): Promise<PersistedAuditEvent | null>;
  list(tenantId: string, options?: { limit?: number }): Promise<PersistedAuditEvent[]>;
  search(tenantId: string, query: { event?: string; category?: string; correlationId?: string }): Promise<PersistedAuditEvent[]>;
  listByCorrelationId(tenantId: string, correlationId: string): Promise<PersistedAuditEvent[]>;
  listByTarget(tenantId: string, targetType: string, targetId: string): Promise<PersistedAuditEvent[]>;
};

/* ── Workflow ────────────────────────────────────────── */

export type PersistedWorkflowDefinition = {
  id: string;
  tenantId: string | null;
  workflowKey: string;
  version: string;
  name: string;
  description: string | null;
  definition: Record<string, JsonValue>;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PersistedWorkflowInstance = {
  id: string;
  tenantId: string;
  workflowDefinitionId: string;
  workflowKey: string;
  workflowVersion: string;
  currentState: string;
  status: string;
  targetType: string | null;
  targetId: string | null;
  data: Record<string, JsonValue>;
  metadata: Record<string, JsonValue>;
  correlationId: string | null;
  transitionCount: number;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersistedWorkflowHistory = {
  id: string;
  tenantId: string;
  workflowInstanceId: string;
  transitionId: string | null;
  event: string;
  fromState: string | null;
  toState: string | null;
  actorId: string | null;
  actorType: string | null;
  systemActorKey: string | null;
  reason: string | null;
  metadata: Record<string, JsonValue>;
  correlationId: string | null;
  requestId: string | null;
  createdAt: string;
};

export type PersistedPendingAction = {
  id: string;
  tenantId: string;
  parentId: string;
  actionType: string;
  payload: Record<string, JsonValue>;
  status: string;
  attempts: number;
  lastError: string | null;
  scheduledAt: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowRepository = {
  saveDefinition(def: Omit<PersistedWorkflowDefinition, "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }): Promise<PersistedWorkflowDefinition>;
  getDefinition(tenantId: string | null, workflowKey: string, version?: string): Promise<PersistedWorkflowDefinition | null>;
  createInstance(instance: Omit<PersistedWorkflowInstance, "createdAt" | "updatedAt" | "transitionCount"> & { transitionCount?: number }): Promise<PersistedWorkflowInstance>;
  getInstance(tenantId: string, id: string): Promise<PersistedWorkflowInstance | null>;
  updateInstance(tenantId: string, id: string, patch: Partial<PersistedWorkflowInstance>): Promise<PersistedWorkflowInstance>;
  appendHistory(entry: Omit<PersistedWorkflowHistory, "id" | "createdAt"> & { id?: string }): Promise<PersistedWorkflowHistory>;
  savePendingActions(actions: PersistedPendingAction[]): Promise<PersistedPendingAction[]>;
  listInstances(tenantId: string, options?: { status?: string }): Promise<PersistedWorkflowInstance[]>;
  listHistory(tenantId: string, instanceId: string): Promise<PersistedWorkflowHistory[]>;
};

/* ── Approval ────────────────────────────────────────── */

export type PersistedApprovalDefinition = {
  id: string;
  tenantId: string | null;
  approvalKey: string;
  version: string;
  name: string;
  description: string | null;
  definition: Record<string, JsonValue>;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PersistedApprovalRequest = {
  id: string;
  tenantId: string;
  approvalDefinitionId: string;
  approvalKey: string;
  approvalVersion: string;
  requesterActorType: string;
  requesterId: string | null;
  requesterSystemKey: string | null;
  targetType: string | null;
  targetId: string | null;
  amount: number | null;
  currency: string | null;
  currentLevel: string | null;
  status: string;
  data: Record<string, JsonValue>;
  metadata: Record<string, JsonValue>;
  correlationId: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersistedApprovalDecision = {
  id: string;
  tenantId: string;
  approvalRequestId: string;
  levelId: string | null;
  approverActorType: string;
  approverId: string | null;
  approverSystemKey: string | null;
  approverRole: string | null;
  decision: string;
  reason: string | null;
  metadata: Record<string, JsonValue>;
  correlationId: string | null;
  requestId: string | null;
  createdAt: string;
};

export type PersistedApprovalHistory = {
  id: string;
  tenantId: string;
  approvalRequestId: string;
  previousStatus: string | null;
  newStatus: string;
  event: string;
  actorType: string | null;
  actorId: string | null;
  systemActorKey: string | null;
  reason: string | null;
  metadata: Record<string, JsonValue>;
  createdAt: string;
};

export type ApprovalRepository = {
  saveDefinition(def: Omit<PersistedApprovalDefinition, "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }): Promise<PersistedApprovalDefinition>;
  createRequest(req: Omit<PersistedApprovalRequest, "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }): Promise<PersistedApprovalRequest>;
  getRequest(tenantId: string, id: string): Promise<PersistedApprovalRequest | null>;
  updateRequest(tenantId: string, id: string, patch: Partial<PersistedApprovalRequest>): Promise<PersistedApprovalRequest>;
  appendDecision(decision: Omit<PersistedApprovalDecision, "id" | "createdAt"> & { id?: string }): Promise<PersistedApprovalDecision>;
  appendHistory(entry: Omit<PersistedApprovalHistory, "id" | "createdAt"> & { id?: string }): Promise<PersistedApprovalHistory>;
  savePendingActions(actions: PersistedPendingAction[]): Promise<PersistedPendingAction[]>;
  listDecisions(tenantId: string, requestId: string): Promise<PersistedApprovalDecision[]>;
};

/* ── Notification ────────────────────────────────────── */

export type PersistedNotification = {
  id: string;
  tenantId: string;
  event: string;
  category: string;
  priority: string;
  title: string;
  message: string;
  status: string;
  templateId: string | null;
  source: string | null;
  metadata: Record<string, JsonValue>;
  correlationId: string | null;
  requestId: string | null;
  scheduledAt: string | null;
  expiresAt: string | null;
  deduplicationKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersistedNotificationRecipient = {
  id: string;
  tenantId: string;
  notificationId: string;
  recipientType: string;
  recipientId: string;
  channel: string;
  status: string;
  readAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersistedDeliveryAttempt = {
  id: string;
  tenantId: string;
  notificationId: string;
  notificationRecipientId: string | null;
  channel: string;
  attemptNumber: number;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  responseMetadata: Record<string, JsonValue>;
  nextAttemptAt: string | null;
  createdAt: string;
};

export type PersistedNotificationPreference = {
  id: string;
  tenantId: string;
  userId: string;
  enabledChannels: string[];
  allowedCategories: string[];
  minimumPriority: string;
  quietHours: Record<string, JsonValue>;
  digestMode: string | null;
  language: string | null;
  timezone: string | null;
  optOut: boolean;
  metadata: Record<string, JsonValue>;
  createdAt: string;
  updatedAt: string;
};

export type NotificationRepository = {
  create(n: Omit<PersistedNotification, "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }): Promise<PersistedNotification>;
  getById(tenantId: string, id: string): Promise<PersistedNotification | null>;
  listForUser(tenantId: string, userId: string): Promise<PersistedNotification[]>;
  listUnread(tenantId: string, userId: string): Promise<PersistedNotification[]>;
  markAsRead(tenantId: string, notificationId: string, userId: string, now?: string): Promise<PersistedNotificationRecipient | null>;
  saveRecipients(recipients: PersistedNotificationRecipient[]): Promise<PersistedNotificationRecipient[]>;
  saveDeliveryAttempt(attempt: Omit<PersistedDeliveryAttempt, "id" | "createdAt"> & { id?: string }): Promise<PersistedDeliveryAttempt>;
  findDuplicate(tenantId: string, deduplicationKey: string): Promise<PersistedNotification | null>;
};

export type NotificationPreferencesRepository = {
  get(tenantId: string, userId: string): Promise<PersistedNotificationPreference | null>;
  upsert(pref: Omit<PersistedNotificationPreference, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<PersistedNotificationPreference>;
};

/* ── RBAC ────────────────────────────────────────────── */

export type PersistedTenantRole = {
  id: string;
  tenantId: string;
  roleKey: string;
  name: string;
  description: string | null;
  level: number;
  type: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthorizationSnapshot = {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  overrides: { permissionKey: string; effect: string }[];
};

export type RbacRepository = {
  listRoles(tenantId: string): Promise<PersistedTenantRole[]>;
  getUserRoles(tenantId: string, userId: string): Promise<string[]>;
  getRolePermissions(tenantId: string, roleId: string): Promise<string[]>;
  getUserOverrides(tenantId: string, userId: string): Promise<{ permissionKey: string; effect: string }[]>;
  resolveAuthorizationSnapshot(tenantId: string, userId: string): Promise<AuthorizationSnapshot>;
};

/* ── Outbox / Idempotency ────────────────────────────── */

export type OutboxRepository = {
  enqueue(input: {
    tenantId: string;
    eventType: OutboxEventType | string;
    aggregateType: string;
    aggregateId: string;
    payload?: Record<string, JsonValue>;
    correlationId?: string | null;
    requestId?: string | null;
    availableAt?: string;
    maxAttempts?: number;
  }): Promise<EnterpriseOutboxEvent>;
  claimBatch(input: {
    tenantId: string;
    /** Identidade estável do processor (locked_by) */
    processorId: string;
    limit?: number;
    now?: string;
    lockTtlSeconds?: number;
  }): Promise<EnterpriseOutboxEvent[]>;
  /**
   * @deprecated Preferir claimBatch; markProcessing directo não é server-only no Supabase.
   * Em memória: exige processorId para ownership.
   */
  markProcessing(input: {
    tenantId: string;
    id: string;
    processorId: string;
    now?: string;
  }): Promise<EnterpriseOutboxEvent>;
  markCompleted(input: {
    tenantId: string;
    id: string;
    processorId: string;
    now?: string;
  }): Promise<EnterpriseOutboxEvent>;
  markFailed(input: {
    tenantId: string;
    id: string;
    processorId: string;
    error: string;
    retry?: boolean;
    now?: string;
  }): Promise<EnterpriseOutboxEvent>;
  releaseExpiredLocks(input: {
    tenantId: string;
    now?: string;
    lockTtlSeconds?: number;
  }): Promise<number>;
  countByStatus(tenantId: string, status: string): Promise<number>;
};

export type IdempotencyCheckResult = {
  hit: boolean;
  conflict: boolean;
  record: IdempotencyRecord | null;
};

export type IdempotencyRepository = {
  check(input: {
    tenantId: string;
    idempotencyKey: string;
    operation: string;
    requestHash: string;
    now?: string;
  }): Promise<IdempotencyCheckResult>;
  store(input: {
    tenantId: string;
    idempotencyKey: string;
    operation: string;
    requestHash: string;
    responseSnapshot: Record<string, JsonValue>;
    expiresAt?: string | null;
    now?: string;
  }): Promise<IdempotencyRecord>;
  countConflicts(tenantId: string): Promise<number>;
};
