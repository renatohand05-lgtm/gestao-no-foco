/**
 * Sprint 21.6 — Store em memória (testes · sem Supabase).
 * Isolamento por tenant garantido em cada operação.
 */

import { EnterpriseError, ENTERPRISE_ERROR_CODES } from "../errors.ts";
import { newEntityId, nowIso } from "../mappers.ts";
import type {
  EnterpriseOutboxEvent,
  IdempotencyRecord,
  JsonValue,
} from "../types.ts";
import type {
  ApprovalRepository,
  AuditRepository,
  AuthorizationSnapshot,
  IdempotencyCheckResult,
  IdempotencyRepository,
  NotificationPreferencesRepository,
  NotificationRepository,
  OutboxRepository,
  PersistedApprovalDecision,
  PersistedApprovalDefinition,
  PersistedApprovalHistory,
  PersistedApprovalRequest,
  ApprovalListRequestsQuery,
  ApprovalListRequestsResult,
  PersistedAuditEvent,
  PersistedDeliveryAttempt,
  PersistedNotification,
  PersistedNotificationPreference,
  PersistedNotificationRecipient,
  PersistedPendingAction,
  PersistedTenantRole,
  PersistedWorkflowDefinition,
  PersistedWorkflowHistory,
  PersistedWorkflowInstance,
  RbacRepository,
  WorkflowRepository,
} from "./contracts.ts";

function assertTenant(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new EnterpriseError("Isolamento multi-tenant violado.", {
      code: ENTERPRISE_ERROR_CODES.TENANT_MISMATCH,
    });
  }
}

export class MemoryEnterpriseStore {
  audit: PersistedAuditEvent[] = [];
  workflowDefs: PersistedWorkflowDefinition[] = [];
  workflowInstances: PersistedWorkflowInstance[] = [];
  workflowHistory: PersistedWorkflowHistory[] = [];
  workflowPending: PersistedPendingAction[] = [];
  approvalDefs: PersistedApprovalDefinition[] = [];
  approvalRequests: PersistedApprovalRequest[] = [];
  approvalDecisions: PersistedApprovalDecision[] = [];
  approvalHistory: PersistedApprovalHistory[] = [];
  approvalPending: PersistedPendingAction[] = [];
  notifications: PersistedNotification[] = [];
  notificationRecipients: PersistedNotificationRecipient[] = [];
  deliveryAttempts: PersistedDeliveryAttempt[] = [];
  notificationPrefs: PersistedNotificationPreference[] = [];
  roles: PersistedTenantRole[] = [];
  rolePermissions: { tenantId: string; roleId: string; permissionKey: string }[] = [];
  userRoles: { tenantId: string; userId: string; roleId: string; roleKey: string }[] = [];
  overrides: { tenantId: string; userId: string; permissionKey: string; effect: string }[] = [];
  outbox: EnterpriseOutboxEvent[] = [];
  idempotency: IdempotencyRecord[] = [];
  auditWriteFailures = 0;
  idempotencyConflicts = 0;

  clear(): void {
    this.audit = [];
    this.workflowDefs = [];
    this.workflowInstances = [];
    this.workflowHistory = [];
    this.workflowPending = [];
    this.approvalDefs = [];
    this.approvalRequests = [];
    this.approvalDecisions = [];
    this.approvalHistory = [];
    this.approvalPending = [];
    this.notifications = [];
    this.notificationRecipients = [];
    this.deliveryAttempts = [];
    this.notificationPrefs = [];
    this.roles = [];
    this.rolePermissions = [];
    this.userRoles = [];
    this.overrides = [];
    this.outbox = [];
    this.idempotency = [];
    this.auditWriteFailures = 0;
    this.idempotencyConflicts = 0;
  }
}

export function createMemoryAuditRepository(store: MemoryEnterpriseStore): AuditRepository {
  return {
    async append(event) {
      const row: PersistedAuditEvent = {
        id: event.id ?? newEntityId("audit"),
        tenantId: event.tenantId,
        userId: event.userId ?? null,
        actorType: event.actorType,
        systemActorKey: event.systemActorKey ?? null,
        event: event.event,
        category: event.category,
        severity: event.severity,
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
        resource: event.resource ?? null,
        module: event.module ?? null,
        description: event.description ?? null,
        metadata: event.metadata ?? {},
        origin: event.origin ?? null,
        correlationId: event.correlationId ?? null,
        requestId: event.requestId ?? null,
        sessionId: event.sessionId ?? null,
        ipAddress: event.ipAddress ?? null,
        device: event.device ?? null,
        createdAt: event.createdAt ?? nowIso(),
      };
      store.audit.push(Object.freeze({ ...row, metadata: { ...row.metadata } }) as PersistedAuditEvent);
      return row;
    },
    async findById(tenantId, id) {
      return store.audit.find((e) => e.tenantId === tenantId && e.id === id) ?? null;
    },
    async list(tenantId, options) {
      return store.audit
        .filter((e) => e.tenantId === tenantId)
        .slice(-(options?.limit ?? 100));
    },
    async search(tenantId, query) {
      return store.audit.filter((e) => {
        if (e.tenantId !== tenantId) return false;
        if (query.event && e.event !== query.event) return false;
        if (query.category && e.category !== query.category) return false;
        if (query.correlationId && e.correlationId !== query.correlationId) return false;
        return true;
      });
    },
    async listByCorrelationId(tenantId, correlationId) {
      return store.audit.filter(
        (e) => e.tenantId === tenantId && e.correlationId === correlationId,
      );
    },
    async listByTarget(tenantId, targetType, targetId) {
      return store.audit.filter(
        (e) =>
          e.tenantId === tenantId &&
          e.targetType === targetType &&
          e.targetId === targetId,
      );
    },
  };
}

export function createMemoryWorkflowRepository(
  store: MemoryEnterpriseStore,
): WorkflowRepository {
  return {
    async saveDefinition(def) {
      const now = nowIso();
      const row: PersistedWorkflowDefinition = {
        ...def,
        description: def.description ?? null,
        createdAt: def.createdAt ?? now,
        updatedAt: def.updatedAt ?? now,
      };
      store.workflowDefs = store.workflowDefs.filter(
        (d) =>
          !(
            d.workflowKey === row.workflowKey &&
            d.version === row.version &&
            d.tenantId === row.tenantId
          ),
      );
      store.workflowDefs.push(row);
      return row;
    },
    async getDefinition(tenantId, workflowKey, version = "1.0.0") {
      return (
        store.workflowDefs.find(
          (d) =>
            d.workflowKey === workflowKey &&
            d.version === version &&
            (d.tenantId === tenantId || d.tenantId === null),
        ) ?? null
      );
    },
    async createInstance(instance) {
      const now = nowIso();
      const row: PersistedWorkflowInstance = {
        ...instance,
        transitionCount: instance.transitionCount ?? 0,
        completedAt: instance.completedAt ?? null,
        createdAt: now,
        updatedAt: now,
      };
      store.workflowInstances.push(row);
      return row;
    },
    async getInstance(tenantId, id) {
      const row = store.workflowInstances.find((i) => i.id === id) ?? null;
      if (row) assertTenant(tenantId, row.tenantId);
      return row;
    },
    async updateInstance(tenantId, id, patch) {
      const idx = store.workflowInstances.findIndex((i) => i.id === id);
      if (idx < 0) throw new EnterpriseError("Workflow instance não encontrada.", { code: ENTERPRISE_ERROR_CODES.NOT_FOUND });
      assertTenant(tenantId, store.workflowInstances[idx]!.tenantId);
      const updated = {
        ...store.workflowInstances[idx]!,
        ...patch,
        tenantId,
        id,
        updatedAt: nowIso(),
      };
      store.workflowInstances[idx] = updated;
      return updated;
    },
    async appendHistory(entry) {
      const row: PersistedWorkflowHistory = {
        id: entry.id ?? newEntityId("wh"),
        ...entry,
        createdAt: nowIso(),
      };
      // imutável: apenas append
      store.workflowHistory.push(Object.freeze({ ...row }) as PersistedWorkflowHistory);
      return row;
    },
    async savePendingActions(actions) {
      store.workflowPending.push(...actions);
      return actions;
    },
    async listInstances(tenantId, options) {
      return store.workflowInstances.filter(
        (i) =>
          i.tenantId === tenantId &&
          (!options?.status || i.status === options.status),
      );
    },
    async listHistory(tenantId, instanceId) {
      return store.workflowHistory.filter(
        (h) => h.tenantId === tenantId && h.workflowInstanceId === instanceId,
      );
    },
  };
}

export function createMemoryApprovalRepository(
  store: MemoryEnterpriseStore,
): ApprovalRepository {
  return {
    async saveDefinition(def) {
      const now = nowIso();
      const row = {
        ...def,
        description: def.description ?? null,
        createdAt: def.createdAt ?? now,
        updatedAt: def.updatedAt ?? now,
      };
      store.approvalDefs.push(row);
      return row;
    },
    async createRequest(req) {
      const now = nowIso();
      const row = {
        ...req,
        createdAt: req.createdAt ?? now,
        updatedAt: req.updatedAt ?? now,
      };
      store.approvalRequests.push(row);
      return row;
    },
    async getRequest(tenantId, id) {
      const row = store.approvalRequests.find((r) => r.id === id) ?? null;
      if (row) assertTenant(tenantId, row.tenantId);
      return row;
    },
    async updateRequest(tenantId, id, patch) {
      const idx = store.approvalRequests.findIndex((r) => r.id === id);
      if (idx < 0) throw new EnterpriseError("Approval request não encontrada.", { code: ENTERPRISE_ERROR_CODES.NOT_FOUND });
      assertTenant(tenantId, store.approvalRequests[idx]!.tenantId);
      const updated = {
        ...store.approvalRequests[idx]!,
        ...patch,
        tenantId,
        id,
        updatedAt: nowIso(),
      };
      store.approvalRequests[idx] = updated;
      return updated;
    },
    async appendDecision(decision) {
      const row: PersistedApprovalDecision = {
        id: decision.id ?? newEntityId("ad"),
        ...decision,
        createdAt: nowIso(),
      };
      store.approvalDecisions.push(Object.freeze({ ...row }) as PersistedApprovalDecision);
      return row;
    },
    async appendHistory(entry) {
      const row: PersistedApprovalHistory = {
        id: entry.id ?? newEntityId("ah"),
        ...entry,
        createdAt: nowIso(),
      };
      store.approvalHistory.push(Object.freeze({ ...row }) as PersistedApprovalHistory);
      return row;
    },
    async savePendingActions(actions) {
      store.approvalPending.push(...actions);
      return actions;
    },
    async listDecisions(tenantId, requestId) {
      return store.approvalDecisions.filter(
        (d) => d.tenantId === tenantId && d.approvalRequestId === requestId,
      );
    },
    async listRequests(query: ApprovalListRequestsQuery): Promise<ApprovalListRequestsResult> {
      const page = Math.max(1, query.page ?? 1);
      const limit = Math.min(100, Math.max(1, query.limit ?? 25));
      let rows = store.approvalRequests.filter((r) => r.tenantId === query.tenantId);
      if (query.status) rows = rows.filter((r) => r.status === query.status);
      if (query.requesterId) {
        rows = rows.filter((r) => r.requesterId === query.requesterId);
      }
      if (query.priority) {
        rows = rows.filter(
          (r) => String(r.metadata?.priority ?? "") === query.priority,
        );
      }
      if (query.module) {
        rows = rows.filter(
          (r) => String(r.metadata?.category ?? "") === query.module,
        );
      }
      if (query.workflowId) {
        rows = rows.filter(
          (r) => String(r.metadata?.workflowId ?? "") === query.workflowId,
        );
      }
      if (query.dateFrom) {
        rows = rows.filter((r) => r.createdAt >= query.dateFrom!);
      }
      if (query.dateTo) {
        rows = rows.filter((r) => r.createdAt <= query.dateTo!);
      }
      if (query.approverId) {
        const ids = new Set(
          store.approvalDecisions
            .filter(
              (d) =>
                d.tenantId === query.tenantId &&
                d.approverId === query.approverId,
            )
            .map((d) => d.approvalRequestId),
        );
        rows = rows.filter((r) => ids.has(r.id));
      }
      const orderBy = query.orderBy ?? "createdAt";
      const dir = query.orderDir === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const av = orderBy === "updatedAt" ? a.updatedAt : a.createdAt;
        const bv = orderBy === "updatedAt" ? b.updatedAt : b.createdAt;
        return av.localeCompare(bv) * dir;
      });
      const total = rows.length;
      const start = (page - 1) * limit;
      return {
        items: rows.slice(start, start + limit),
        total,
        page,
        limit,
      };
    },
  };
}

export function createMemoryNotificationRepository(
  store: MemoryEnterpriseStore,
): NotificationRepository {
  return {
    async create(n) {
      const now = nowIso();
      const row = { ...n, createdAt: n.createdAt ?? now, updatedAt: n.updatedAt ?? now };
      store.notifications.push(row);
      return row;
    },
    async getById(tenantId, id) {
      const row = store.notifications.find((n) => n.id === id) ?? null;
      if (row) assertTenant(tenantId, row.tenantId);
      return row;
    },
    async listForUser(tenantId, userId) {
      const ids = new Set(
        store.notificationRecipients
          .filter((r) => r.tenantId === tenantId && r.recipientId === userId)
          .map((r) => r.notificationId),
      );
      return store.notifications.filter((n) => n.tenantId === tenantId && ids.has(n.id));
    },
    async listUnread(tenantId, userId) {
      const unreadIds = new Set(
        store.notificationRecipients
          .filter(
            (r) =>
              r.tenantId === tenantId &&
              r.recipientId === userId &&
              !r.readAt,
          )
          .map((r) => r.notificationId),
      );
      return store.notifications.filter((n) => n.tenantId === tenantId && unreadIds.has(n.id));
    },
    async markAsRead(tenantId, notificationId, userId, now) {
      const row = store.notificationRecipients.find(
        (r) =>
          r.tenantId === tenantId &&
          r.notificationId === notificationId &&
          r.recipientId === userId,
      );
      if (!row) return null;
      row.readAt = now ?? nowIso();
      row.status = "read";
      row.updatedAt = row.readAt;
      return row;
    },
    async saveRecipients(recipients) {
      store.notificationRecipients.push(...recipients);
      return recipients;
    },
    async saveDeliveryAttempt(attempt) {
      const row: PersistedDeliveryAttempt = {
        id: attempt.id ?? newEntityId("nda"),
        ...attempt,
        createdAt: nowIso(),
      };
      store.deliveryAttempts.push(Object.freeze({ ...row }) as PersistedDeliveryAttempt);
      return row;
    },
    async findDuplicate(tenantId, deduplicationKey) {
      return (
        store.notifications.find(
          (n) =>
            n.tenantId === tenantId && n.deduplicationKey === deduplicationKey,
        ) ?? null
      );
    },
  };
}

export function createMemoryNotificationPreferencesRepository(
  store: MemoryEnterpriseStore,
): NotificationPreferencesRepository {
  return {
    async get(tenantId, userId) {
      return (
        store.notificationPrefs.find(
          (p) => p.tenantId === tenantId && p.userId === userId,
        ) ?? null
      );
    },
    async upsert(pref) {
      const now = nowIso();
      const idx = store.notificationPrefs.findIndex(
        (p) => p.tenantId === pref.tenantId && p.userId === pref.userId,
      );
      const row: PersistedNotificationPreference = {
        id: pref.id ?? newEntityId("npref"),
        ...pref,
        createdAt: idx >= 0 ? store.notificationPrefs[idx]!.createdAt : now,
        updatedAt: now,
      };
      if (idx >= 0) store.notificationPrefs[idx] = row;
      else store.notificationPrefs.push(row);
      return row;
    },
  };
}

export function createMemoryRbacRepository(store: MemoryEnterpriseStore): RbacRepository {
  return {
    async listRoles(tenantId) {
      return store.roles.filter((r) => r.tenantId === tenantId && r.isActive);
    },
    async getUserRoles(tenantId, userId) {
      return store.userRoles
        .filter((r) => r.tenantId === tenantId && r.userId === userId)
        .map((r) => r.roleKey);
    },
    async getRolePermissions(tenantId, roleId) {
      return store.rolePermissions
        .filter((p) => p.tenantId === tenantId && p.roleId === roleId)
        .map((p) => p.permissionKey);
    },
    async getUserOverrides(tenantId, userId) {
      return store.overrides
        .filter((o) => o.tenantId === tenantId && o.userId === userId)
        .map((o) => ({ permissionKey: o.permissionKey, effect: o.effect }));
    },
    async resolveAuthorizationSnapshot(tenantId, userId): Promise<AuthorizationSnapshot> {
      const roleKeys = await this.getUserRoles(tenantId, userId);
      const roleIds = store.userRoles
        .filter((r) => r.tenantId === tenantId && r.userId === userId)
        .map((r) => r.roleId);
      const permissions = new Set<string>();
      for (const roleId of roleIds) {
        for (const p of await this.getRolePermissions(tenantId, roleId)) {
          permissions.add(p);
        }
      }
      const overrides = await this.getUserOverrides(tenantId, userId);
      for (const o of overrides) {
        if (o.effect === "deny") permissions.delete(o.permissionKey);
        if (o.effect === "allow") permissions.add(o.permissionKey);
      }
      return {
        tenantId,
        userId,
        roles: roleKeys,
        permissions: [...permissions].sort(),
        overrides,
      };
    },
  };
}

export function createMemoryOutboxRepository(store: MemoryEnterpriseStore): OutboxRepository {
  return {
    async enqueue(input) {
      const now = nowIso();
      const row: EnterpriseOutboxEvent = {
        id: newEntityId("outbox"),
        tenantId: input.tenantId,
        eventType: input.eventType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        payload: input.payload ?? {},
        status: "pending",
        attempts: 0,
        maxAttempts: input.maxAttempts ?? 5,
        correlationId: input.correlationId ?? null,
        requestId: input.requestId ?? null,
        availableAt: input.availableAt ?? now,
        lockedAt: null,
        lockedBy: null,
        processedAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      };
      store.outbox.push(row);
      return row;
    },
    async claimBatch(input) {
      const processorId = input.processorId?.trim();
      if (!processorId) {
        throw new EnterpriseError("processorId obrigatório.", {
          code: ENTERPRISE_ERROR_CODES.VALIDATION,
        });
      }
      const now = input.now ?? nowIso();
      const nowMs = new Date(now).getTime();
      const limit = input.limit ?? 10;
      const lockTtl = (input.lockTtlSeconds ?? 60) * 1000;
      for (const e of store.outbox) {
        if (
          e.tenantId === input.tenantId &&
          e.status === "processing" &&
          e.lockedAt &&
          nowMs - new Date(e.lockedAt).getTime() > lockTtl
        ) {
          e.status = "pending";
          e.lockedAt = null;
          e.lockedBy = null;
          e.updatedAt = now;
        }
      }
      const claimed: EnterpriseOutboxEvent[] = [];
      for (const e of store.outbox) {
        if (claimed.length >= limit) break;
        if (e.tenantId !== input.tenantId) continue;
        if (e.status !== "pending") continue;
        if (new Date(e.availableAt).getTime() > nowMs) continue;
        e.status = "processing";
        e.lockedAt = now;
        e.lockedBy = processorId;
        e.attempts += 1;
        e.updatedAt = now;
        claimed.push(e);
      }
      return claimed;
    },
    async markProcessing(input) {
      const processorId = input.processorId?.trim();
      if (!processorId) {
        throw new EnterpriseError("processorId obrigatório.", {
          code: ENTERPRISE_ERROR_CODES.VALIDATION,
        });
      }
      const e = store.outbox.find((x) => x.id === input.id);
      if (!e) throw new EnterpriseError("Outbox não encontrado.", { code: ENTERPRISE_ERROR_CODES.NOT_FOUND });
      assertTenant(input.tenantId, e.tenantId);
      if (e.status === "processing" && e.lockedBy && e.lockedBy !== processorId) {
        throw new EnterpriseError("Lock pertence a outro processor.", {
          code: ENTERPRISE_ERROR_CODES.VALIDATION,
        });
      }
      e.status = "processing";
      e.lockedAt = input.now ?? nowIso();
      e.lockedBy = processorId;
      e.updatedAt = e.lockedAt;
      return e;
    },
    async markCompleted(input) {
      const processorId = input.processorId?.trim();
      if (!processorId) {
        throw new EnterpriseError("processorId obrigatório.", {
          code: ENTERPRISE_ERROR_CODES.VALIDATION,
        });
      }
      const e = store.outbox.find((x) => x.id === input.id);
      if (!e) throw new EnterpriseError("Outbox não encontrado.", { code: ENTERPRISE_ERROR_CODES.NOT_FOUND });
      assertTenant(input.tenantId, e.tenantId);
      if (e.status !== "processing" || e.lockedBy !== processorId) {
        throw new EnterpriseError("Somente o processor detentor do lock pode concluir.", {
          code: ENTERPRISE_ERROR_CODES.VALIDATION,
        });
      }
      e.status = "completed";
      e.processedAt = input.now ?? nowIso();
      e.lockedAt = null;
      e.lockedBy = null;
      e.updatedAt = e.processedAt;
      return e;
    },
    async markFailed(input) {
      const processorId = input.processorId?.trim();
      if (!processorId) {
        throw new EnterpriseError("processorId obrigatório.", {
          code: ENTERPRISE_ERROR_CODES.VALIDATION,
        });
      }
      const e = store.outbox.find((x) => x.id === input.id);
      if (!e) throw new EnterpriseError("Outbox não encontrado.", { code: ENTERPRISE_ERROR_CODES.NOT_FOUND });
      assertTenant(input.tenantId, e.tenantId);
      if (e.status !== "processing" || e.lockedBy !== processorId) {
        throw new EnterpriseError("Somente o processor detentor do lock pode falhar o evento.", {
          code: ENTERPRISE_ERROR_CODES.VALIDATION,
        });
      }
      const now = input.now ?? nowIso();
      e.lastError = input.error;
      e.lockedAt = null;
      e.lockedBy = null;
      e.updatedAt = now;
      if (input.retry !== false && e.attempts < e.maxAttempts) {
        e.status = "pending";
        e.availableAt = new Date(new Date(now).getTime() + e.attempts * 60_000).toISOString();
      } else {
        e.status = e.attempts >= e.maxAttempts ? "dead" : "failed";
      }
      return e;
    },
    async releaseExpiredLocks(input) {
      const now = input.now ?? nowIso();
      let n = 0;
      for (const e of store.outbox) {
        if (e.tenantId !== input.tenantId) continue;
        if (e.status === "processing" && e.lockedAt) {
          e.status = "pending";
          e.lockedAt = null;
          e.lockedBy = null;
          e.updatedAt = now;
          n += 1;
        }
      }
      return n;
    },
    async countByStatus(tenantId, status) {
      return store.outbox.filter((e) => e.tenantId === tenantId && e.status === status).length;
    },
  };
}

export function createMemoryIdempotencyRepository(
  store: MemoryEnterpriseStore,
): IdempotencyRepository {
  return {
    async check(input): Promise<IdempotencyCheckResult> {
      const now = input.now ?? nowIso();
      const record =
        store.idempotency.find(
          (r) =>
            r.tenantId === input.tenantId &&
            r.idempotencyKey === input.idempotencyKey &&
            r.operation === input.operation,
        ) ?? null;

      if (!record) return { hit: false, conflict: false, record: null };
      if (record.expiresAt && new Date(record.expiresAt).getTime() < new Date(now).getTime()) {
        store.idempotency = store.idempotency.filter((r) => r.id !== record.id);
        return { hit: false, conflict: false, record: null };
      }
      if (record.requestHash !== input.requestHash) {
        store.idempotencyConflicts += 1;
        return { hit: true, conflict: true, record };
      }
      return { hit: true, conflict: false, record };
    },
    async store(input) {
      const now = input.now ?? nowIso();
      const existing = store.idempotency.find(
        (r) =>
          r.tenantId === input.tenantId &&
          r.idempotencyKey === input.idempotencyKey &&
          r.operation === input.operation,
      );
      if (existing && existing.requestHash !== input.requestHash) {
        store.idempotencyConflicts += 1;
        throw new EnterpriseError("Conflito de idempotência.", {
          code: ENTERPRISE_ERROR_CODES.IDEMPOTENCY_CONFLICT,
        });
      }
      const row: IdempotencyRecord = {
        id: existing?.id ?? newEntityId("idem"),
        tenantId: input.tenantId,
        idempotencyKey: input.idempotencyKey,
        operation: input.operation,
        requestHash: input.requestHash,
        responseSnapshot: input.responseSnapshot,
        status: "completed",
        expiresAt: input.expiresAt ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      if (existing) {
        Object.assign(existing, row);
        return existing;
      }
      store.idempotency.push(row);
      return row;
    },
    async countConflicts(tenantId) {
      void tenantId;
      return store.idempotencyConflicts;
    },
  };
}

export type MemoryEnterpriseKit = {
  store: MemoryEnterpriseStore;
  audit: AuditRepository;
  workflow: WorkflowRepository;
  approval: ApprovalRepository;
  notification: NotificationRepository;
  notificationPreferences: NotificationPreferencesRepository;
  rbac: RbacRepository;
  outbox: OutboxRepository;
  idempotency: IdempotencyRepository;
};

export function createMemoryEnterpriseKit(): MemoryEnterpriseKit {
  const store = new MemoryEnterpriseStore();
  return {
    store,
    audit: createMemoryAuditRepository(store),
    workflow: createMemoryWorkflowRepository(store),
    approval: createMemoryApprovalRepository(store),
    notification: createMemoryNotificationRepository(store),
    notificationPreferences: createMemoryNotificationPreferencesRepository(store),
    rbac: createMemoryRbacRepository(store),
    outbox: createMemoryOutboxRepository(store),
    idempotency: createMemoryIdempotencyRepository(store),
  };
}

// silence unused JsonValue if needed
void (null as unknown as JsonValue);
