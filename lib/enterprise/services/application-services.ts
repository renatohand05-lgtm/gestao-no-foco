/**
 * Sprint 21.6 — Services de aplicação (coordenam engines + repos + outbox).
 */

import { assertEnterpriseContext, assertSameTenant } from "../context.ts";
import { executeIdempotent } from "../idempotency.ts";
import { newEntityId, nowIso } from "../mappers.ts";
import { enqueueEnterpriseEvent } from "../outbox.ts";
import { runCoordinatedTransaction } from "../transaction.ts";
import type { EnterpriseContext, JsonValue } from "../types.ts";
import type {
  ApprovalRepository,
  AuditRepository,
  IdempotencyRepository,
  NotificationRepository,
  OutboxRepository,
  PersistedApprovalRequest,
  PersistedAuditEvent,
  PersistedNotification,
  PersistedWorkflowInstance,
  RbacRepository,
  WorkflowRepository,
} from "../repositories/contracts.ts";

export type EnterpriseRepos = {
  audit: AuditRepository;
  workflow: WorkflowRepository;
  approval: ApprovalRepository;
  notification: NotificationRepository;
  rbac: RbacRepository;
  outbox: OutboxRepository;
  idempotency: IdempotencyRepository;
};

export function createAuditService(
  repos: Pick<EnterpriseRepos, "audit" | "outbox" | "idempotency">,
) {
  return {
    async recordEvent(
      context: EnterpriseContext,
      input: {
        event: string;
        category: string;
        severity?: string;
        description?: string;
        targetType?: string;
        targetId?: string;
        metadata?: Record<string, JsonValue>;
        idempotencyKey?: string;
      },
    ): Promise<PersistedAuditEvent> {
      assertEnterpriseContext(context);
      const write = async () => {
        const row = await repos.audit.append({
          tenantId: context.tenantId,
          userId: context.userId,
          actorType: context.actorType,
          systemActorKey: context.systemActorKey,
          event: input.event,
          category: input.category,
          severity: input.severity ?? "info",
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          resource: null,
          module: null,
          description: input.description ?? null,
          metadata: input.metadata ?? {},
          origin: context.source,
          correlationId: context.correlationId,
          requestId: context.requestId,
          sessionId: context.sessionId,
          ipAddress: null,
          device: null,
        });
        await enqueueEnterpriseEvent(repos.outbox, {
          context,
          eventType: "AUDIT_EVENT_CREATED",
          aggregateType: "audit_event",
          aggregateId: row.id,
          payload: { event: row.event },
        });
        return row;
      };

      if (input.idempotencyKey) {
        const { result } = await executeIdempotent(repos.idempotency, {
          context,
          idempotencyKey: input.idempotencyKey,
          operation: "audit.recordEvent",
          request: input,
          run: write,
        });
        return result as PersistedAuditEvent;
      }
      return write();
    },

    async searchEvents(
      context: EnterpriseContext,
      query: { event?: string; category?: string; correlationId?: string },
    ) {
      assertEnterpriseContext(context);
      return repos.audit.search(context.tenantId, query);
    },

    async getTimeline(context: EnterpriseContext, correlationId: string) {
      assertEnterpriseContext(context);
      return repos.audit.listByCorrelationId(context.tenantId, correlationId);
    },
  };
}

export function createWorkflowService(
  repos: Pick<EnterpriseRepos, "workflow" | "outbox" | "idempotency" | "audit">,
) {
  return {
    async startWorkflow(
      context: EnterpriseContext,
      input: {
        workflowKey: string;
        workflowVersion?: string;
        definitionId?: string;
        targetType?: string;
        targetId?: string;
        data?: Record<string, JsonValue>;
        idempotencyKey?: string;
      },
    ): Promise<PersistedWorkflowInstance> {
      assertEnterpriseContext(context);
      const run = async () => {
        const def =
          (await repos.workflow.getDefinition(
            context.tenantId,
            input.workflowKey,
            input.workflowVersion ?? "1.0.0",
          )) ??
          (await repos.workflow.getDefinition(
            null,
            input.workflowKey,
            input.workflowVersion ?? "1.0.0",
          ));

        const instance = await repos.workflow.createInstance({
          id: newEntityId("wi"),
          tenantId: context.tenantId,
          workflowDefinitionId: input.definitionId ?? def?.id ?? "unknown",
          workflowKey: input.workflowKey,
          workflowVersion: input.workflowVersion ?? def?.version ?? "1.0.0",
          currentState: "started",
          status: "running",
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          data: input.data ?? {},
          metadata: {},
          correlationId: context.correlationId,
          startedAt: nowIso(),
          completedAt: null,
        });

        await repos.workflow.appendHistory({
          tenantId: context.tenantId,
          workflowInstanceId: instance.id,
          transitionId: null,
          event: "STARTED",
          fromState: null,
          toState: "started",
          actorId: context.userId,
          actorType: context.actorType,
          systemActorKey: context.systemActorKey,
          reason: null,
          metadata: {},
          correlationId: context.correlationId,
          requestId: context.requestId,
        });

        await enqueueEnterpriseEvent(repos.outbox, {
          context,
          eventType: "WORKFLOW_TRANSITION_EXECUTED",
          aggregateType: "workflow_instance",
          aggregateId: instance.id,
          payload: { event: "STARTED", toState: "started" },
        });

        return instance;
      };

      if (input.idempotencyKey) {
        const { result } = await executeIdempotent(repos.idempotency, {
          context,
          idempotencyKey: input.idempotencyKey,
          operation: "workflow.start",
          request: input,
          run,
        });
        return result as PersistedWorkflowInstance;
      }
      return run();
    },

    async transitionWorkflow(
      context: EnterpriseContext,
      input: {
        instanceId: string;
        event: string;
        toState: string;
        reason?: string;
        idempotencyKey?: string;
      },
    ) {
      assertEnterpriseContext(context);
      const run = async () => {
        const instance = await repos.workflow.getInstance(
          context.tenantId,
          input.instanceId,
        );
        if (!instance) throw new Error("Workflow instance não encontrada.");

        const tx = await runCoordinatedTransaction(
          [
            {
              name: "update_instance",
              run: async () => {
                await repos.workflow.updateInstance(context.tenantId, instance.id, {
                  currentState: input.toState,
                  status: "running",
                  transitionCount: instance.transitionCount + 1,
                });
              },
            },
            {
              name: "append_history",
              run: async () => {
                await repos.workflow.appendHistory({
                  tenantId: context.tenantId,
                  workflowInstanceId: instance.id,
                  transitionId: null,
                  event: input.event,
                  fromState: instance.currentState,
                  toState: input.toState,
                  actorId: context.userId,
                  actorType: context.actorType,
                  systemActorKey: context.systemActorKey,
                  reason: input.reason ?? null,
                  metadata: {},
                  correlationId: context.correlationId,
                  requestId: context.requestId,
                });
              },
            },
            {
              name: "audit",
              run: async () => {
                await repos.audit.append({
                  tenantId: context.tenantId,
                  userId: context.userId,
                  actorType: context.actorType,
                  systemActorKey: context.systemActorKey,
                  event: "WORKFLOW_TRANSITIONED",
                  category: "workflow",
                  severity: "info",
                  targetType: "workflow_instance",
                  targetId: instance.id,
                  resource: null,
                  module: "workflow",
                  description: input.event,
                  metadata: { toState: input.toState },
                  origin: context.source,
                  correlationId: context.correlationId,
                  requestId: context.requestId,
                  sessionId: context.sessionId,
                  ipAddress: null,
                  device: null,
                });
              },
            },
            {
              name: "outbox",
              run: async () => {
                await enqueueEnterpriseEvent(repos.outbox, {
                  context,
                  eventType: "WORKFLOW_TRANSITIONED",
                  aggregateType: "workflow_instance",
                  aggregateId: instance.id,
                  payload: {
                    event: input.event,
                    toState: input.toState,
                  },
                });
              },
            },
          ],
          async () =>
            repos.workflow.getInstance(context.tenantId, instance.id),
        );

        if (!tx.ok) throw new Error(tx.error ?? "Transição falhou.");
        return tx.result!;
      };

      if (input.idempotencyKey) {
        const { result } = await executeIdempotent(repos.idempotency, {
          context,
          idempotencyKey: input.idempotencyKey,
          operation: "workflow.transition",
          request: input,
          run,
        });
        return result as PersistedWorkflowInstance;
      }
      return run();
    },

    async getWorkflowInstance(context: EnterpriseContext, id: string) {
      assertEnterpriseContext(context);
      return repos.workflow.getInstance(context.tenantId, id);
    },

    async getAvailableTransitions(context: EnterpriseContext, instanceId: string) {
      assertEnterpriseContext(context);
      const instance = await repos.workflow.getInstance(
        context.tenantId,
        instanceId,
      );
      if (!instance) return [];
      return [{ from: instance.currentState, event: "*", note: "domínio decide" }];
    },
  };
}

export function createApprovalService(
  repos: Pick<
    EnterpriseRepos,
    "approval" | "outbox" | "idempotency" | "audit" | "notification"
  >,
) {
  return {
    async requestApproval(
      context: EnterpriseContext,
      input: {
        approvalKey: string;
        approvalVersion?: string;
        definitionId?: string;
        targetType?: string;
        targetId?: string;
        amount?: number | null;
        currency?: string | null;
        data?: Record<string, JsonValue>;
        idempotencyKey?: string;
      },
    ): Promise<PersistedApprovalRequest> {
      assertEnterpriseContext(context);
      const run = async () => {
        const req = await repos.approval.createRequest({
          id: newEntityId("apr"),
          tenantId: context.tenantId,
          approvalDefinitionId: input.definitionId ?? "default",
          approvalKey: input.approvalKey,
          approvalVersion: input.approvalVersion ?? "1.0.0",
          requesterActorType: context.actorType,
          requesterId: context.userId,
          requesterSystemKey: context.systemActorKey,
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          amount: input.amount ?? null,
          currency: input.currency ?? null,
          currentLevel: "L1",
          status: "pending",
          data: input.data ?? {},
          metadata: {},
          correlationId: context.correlationId,
          expiresAt: null,
          completedAt: null,
        });

        await repos.approval.appendHistory({
          tenantId: context.tenantId,
          approvalRequestId: req.id,
          previousStatus: null,
          newStatus: "pending",
          event: "REQUESTED",
          actorType: context.actorType,
          actorId: context.userId,
          systemActorKey: context.systemActorKey,
          reason: null,
          metadata: {},
        });

        await enqueueEnterpriseEvent(repos.outbox, {
          context,
          eventType: "APPROVAL_REQUESTED",
          aggregateType: "approval_request",
          aggregateId: req.id,
          payload: { approvalKey: req.approvalKey, amount: req.amount },
        });

        return req;
      };

      if (input.idempotencyKey) {
        const { result } = await executeIdempotent(repos.idempotency, {
          context,
          idempotencyKey: input.idempotencyKey,
          operation: "approval.request",
          request: input,
          run,
        });
        return result as PersistedApprovalRequest;
      }
      return run();
    },

    async decideApproval(
      context: EnterpriseContext,
      input: {
        requestId: string;
        decision: string;
        reason?: string;
        levelId?: string;
        idempotencyKey?: string;
      },
    ) {
      assertEnterpriseContext(context);
      const run = async () => {
        const req = await repos.approval.getRequest(
          context.tenantId,
          input.requestId,
        );
        if (!req) throw new Error("Approval request não encontrada.");

        const newStatus =
          input.decision === "APPROVE"
            ? "approved"
            : input.decision === "REJECT"
              ? "rejected"
              : "pending";

        const tx = await runCoordinatedTransaction(
          [
            {
              name: "decision",
              run: async () => {
                await repos.approval.appendDecision({
                  tenantId: context.tenantId,
                  approvalRequestId: req.id,
                  levelId: input.levelId ?? req.currentLevel,
                  approverActorType: context.actorType,
                  approverId: context.userId,
                  approverSystemKey: context.systemActorKey,
                  approverRole: context.roles[0] ?? null,
                  decision: input.decision,
                  reason: input.reason ?? null,
                  metadata: {},
                  correlationId: context.correlationId,
                  requestId: context.requestId,
                });
              },
            },
            {
              name: "update_request",
              run: async () => {
                await repos.approval.updateRequest(context.tenantId, req.id, {
                  status: newStatus,
                  completedAt:
                    newStatus === "pending" ? null : nowIso(),
                });
              },
            },
            {
              name: "history",
              run: async () => {
                await repos.approval.appendHistory({
                  tenantId: context.tenantId,
                  approvalRequestId: req.id,
                  previousStatus: req.status,
                  newStatus,
                  event: input.decision,
                  actorType: context.actorType,
                  actorId: context.userId,
                  systemActorKey: context.systemActorKey,
                  reason: input.reason ?? null,
                  metadata: {},
                });
              },
            },
            {
              name: "audit",
              run: async () => {
                await repos.audit.append({
                  tenantId: context.tenantId,
                  userId: context.userId,
                  actorType: context.actorType,
                  systemActorKey: context.systemActorKey,
                  event: "APPROVAL_DECIDED",
                  category: "approval",
                  severity: "info",
                  targetType: "approval_request",
                  targetId: req.id,
                  resource: null,
                  module: "approval",
                  description: input.decision,
                  metadata: {},
                  origin: context.source,
                  correlationId: context.correlationId,
                  requestId: context.requestId,
                  sessionId: context.sessionId,
                  ipAddress: null,
                  device: null,
                });
              },
            },
            {
              name: "outbox",
              run: async () => {
                await enqueueEnterpriseEvent(repos.outbox, {
                  context,
                  eventType: "APPROVAL_DECIDED",
                  aggregateType: "approval_request",
                  aggregateId: req.id,
                  payload: { decision: input.decision, status: newStatus },
                });
              },
            },
          ],
          async () => repos.approval.getRequest(context.tenantId, req.id),
        );

        if (!tx.ok) throw new Error(tx.error ?? "Decisão falhou.");
        return tx.result!;
      };

      if (input.idempotencyKey) {
        const { result } = await executeIdempotent(repos.idempotency, {
          context,
          idempotencyKey: input.idempotencyKey,
          operation: "approval.decide",
          request: input,
          run,
        });
        return result as PersistedApprovalRequest;
      }
      return run();
    },

    async cancelApproval(context: EnterpriseContext, requestId: string) {
      assertEnterpriseContext(context);
      return repos.approval.updateRequest(context.tenantId, requestId, {
        status: "cancelled",
        completedAt: nowIso(),
      });
    },

    async expireApproval(context: EnterpriseContext, requestId: string) {
      assertEnterpriseContext(context);
      return repos.approval.updateRequest(context.tenantId, requestId, {
        status: "expired",
        completedAt: nowIso(),
      });
    },
  };
}

export function createNotificationService(
  repos: Pick<EnterpriseRepos, "notification" | "outbox" | "idempotency">,
) {
  return {
    async createNotification(
      context: EnterpriseContext,
      input: {
        event: string;
        category: string;
        priority?: string;
        title: string;
        message: string;
        recipients: { type: string; id: string; channel?: string }[];
        deduplicationKey?: string;
        idempotencyKey?: string;
      },
    ): Promise<PersistedNotification> {
      assertEnterpriseContext(context);
      const run = async () => {
        if (input.deduplicationKey) {
          const dup = await repos.notification.findDuplicate(
            context.tenantId,
            input.deduplicationKey,
          );
          if (dup) return dup;
        }

        const n = await repos.notification.create({
          id: newEntityId("notif"),
          tenantId: context.tenantId,
          event: input.event,
          category: input.category,
          priority: input.priority ?? "normal",
          title: input.title,
          message: input.message,
          status: "queued",
          templateId: null,
          source: context.source,
          metadata: {},
          correlationId: context.correlationId,
          requestId: context.requestId,
          scheduledAt: null,
          expiresAt: null,
          deduplicationKey: input.deduplicationKey ?? null,
        });

        const now = nowIso();
        await repos.notification.saveRecipients(
          input.recipients.map((r) => ({
            id: newEntityId("nrec"),
            tenantId: context.tenantId,
            notificationId: n.id,
            recipientType: r.type,
            recipientId: r.id,
            channel: r.channel ?? "in_app",
            status: "queued",
            readAt: null,
            deliveredAt: null,
            createdAt: now,
            updatedAt: now,
          })),
        );

        await enqueueEnterpriseEvent(repos.outbox, {
          context,
          eventType: "NOTIFICATION_REQUESTED",
          aggregateType: "notification",
          aggregateId: n.id,
          payload: { event: n.event },
        });

        return n;
      };

      if (input.idempotencyKey) {
        const { result } = await executeIdempotent(repos.idempotency, {
          context,
          idempotencyKey: input.idempotencyKey,
          operation: "notification.create",
          request: input,
          run,
        });
        return result as PersistedNotification;
      }
      return run();
    },

    async processNotification(context: EnterpriseContext, id: string) {
      assertEnterpriseContext(context);
      const n = await repos.notification.getById(context.tenantId, id);
      return n;
    },

    async markAsRead(context: EnterpriseContext, notificationId: string) {
      assertEnterpriseContext(context);
      if (!context.userId) throw new Error("userId obrigatório para markAsRead.");
      return repos.notification.markAsRead(
        context.tenantId,
        notificationId,
        context.userId,
      );
    },

    async listInbox(context: EnterpriseContext) {
      assertEnterpriseContext(context);
      if (!context.userId) return [];
      return repos.notification.listForUser(context.tenantId, context.userId);
    },
  };
}

export function createAuthorizationService(
  repos: Pick<EnterpriseRepos, "rbac" | "audit" | "outbox">,
) {
  return {
    async resolveAuthorizationContext(context: EnterpriseContext) {
      assertEnterpriseContext(context);
      if (!context.userId) {
        return {
          tenantId: context.tenantId,
          userId: "",
          roles: [] as string[],
          permissions: [] as string[],
          overrides: [] as { permissionKey: string; effect: string }[],
        };
      }
      return repos.rbac.resolveAuthorizationSnapshot(
        context.tenantId,
        context.userId,
      );
    },

    async can(context: EnterpriseContext, permissionKey: string) {
      const snap = await this.resolveAuthorizationContext(context);
      return snap.permissions.includes(permissionKey);
    },

    async authorize(context: EnterpriseContext, permissionKey: string) {
      const allowed = await this.can(context, permissionKey);
      if (!allowed) {
        await this.recordDeniedDecision(context, permissionKey);
      }
      return { allowed, permissionKey };
    },

    async recordDeniedDecision(context: EnterpriseContext, permissionKey: string) {
      assertEnterpriseContext(context);
      await repos.audit.append({
        tenantId: context.tenantId,
        userId: context.userId,
        actorType: context.actorType,
        systemActorKey: context.systemActorKey,
        event: "AUTHORIZATION_DENIED",
        category: "security",
        severity: "warning",
        targetType: "permission",
        targetId: permissionKey,
        resource: permissionKey,
        module: "rbac",
        description: `Negado: ${permissionKey}`,
        metadata: {},
        origin: context.source,
        correlationId: context.correlationId,
        requestId: context.requestId,
        sessionId: context.sessionId,
        ipAddress: null,
        device: null,
      });
      await enqueueEnterpriseEvent(repos.outbox, {
        context,
        eventType: "AUTHORIZATION_DENIED",
        aggregateType: "permission",
        aggregateId: permissionKey,
        payload: { permissionKey },
      });
    },
  };
}

export function assertReposTenant(
  context: EnterpriseContext,
  tenantId: string,
): void {
  assertSameTenant(context, tenantId);
}
