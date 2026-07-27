/**
 * Sprint 21.7 — Approval Runtime Service (orquestrador).
 * Consome engine 21.4 + Enterprise Persistence 21.6 sem duplicar lógica de domínio.
 */

import type { EnterpriseContext, JsonValue } from "../../enterprise/types.ts";
import {
  assertEnterpriseContext,
  enqueueEnterpriseEvent,
  executeIdempotent,
  newEntityId,
  nowIso,
  runCoordinatedTransaction,
} from "../../enterprise/index.ts";
import type {
  ApprovalRepository,
  AuditRepository,
  IdempotencyRepository,
  NotificationRepository,
  OutboxRepository,
  PersistedApprovalRequest,
  ApprovalListRequestsQuery,
  ApprovalListRequestsResult,
  WorkflowRepository,
} from "../../enterprise/repositories/contracts.ts";
import type { AuthorizationSnapshot } from "./approval-runtime-context.ts";
import {
  approvalContextFromEnterprise,
  mergeEnterpriseRoles,
} from "./approval-runtime-context.ts";
import {
  APPROVAL_RUNTIME_ERROR_CODES,
  ApprovalRuntimeError,
} from "./approval-runtime-errors.ts";
import {
  buildApprovalAuditPayload,
  buildNotificationFromRuntime,
  mapOperationToOutboxEvent,
} from "./approval-runtime-events.ts";
import {
  assertRuntimePermission,
} from "./approval-runtime-validator.ts";
import {
  buildApprovalTimeline,
  computeApprovalSla,
  filterRuntimeItems,
  computeApprovalKpis,
  resolveNextStep,
  shouldEscalateBySla,
  toDomainApprovalRequest,
  toPersistedPatchFromDomain,
} from "./approval-runtime.ts";
import type {
  ApprovalRuntimeFilters,
  ApprovalRuntimeKpis,
  ApprovalRuntimeListItem,
  ApprovalRuntimeOperation,
  ApprovalRuntimeResult,
  DelegateApprovalInput,
  EscalateApprovalInput,
} from "./approval-runtime-types.ts";
import {
  appendApprovalHistory,
} from "../approval-history.ts";
import { runApprovalDecision } from "../approval-runner.ts";
import { createApprovalRequest } from "../approval-request.ts";
import type {
  ApprovalDecisionInput,
  ApprovalDefinition,
  ApprovalPendingAction,
  ApprovalRequest,
} from "../types.ts";

export type ApprovalRuntimeDeps = {
  approval: ApprovalRepository;
  audit: AuditRepository;
  notification: NotificationRepository;
  outbox: OutboxRepository;
  idempotency: IdempotencyRepository;
  workflow?: Pick<
    WorkflowRepository,
    "getInstance" | "updateInstance" | "appendHistory"
  >;
  listRequests?: (
    query: ApprovalListRequestsQuery,
  ) => Promise<ApprovalListRequestsResult>;
  resolveDefinition: (
    tenantId: string,
    approvalKey: string,
    version: string,
  ) => Promise<ApprovalDefinition | null>;
  resolveAuthorization?: (
    context: EnterpriseContext,
  ) => Promise<AuthorizationSnapshot | null>;
};

const DECISION_OPERATIONS = new Set<ApprovalRuntimeOperation>([
  "approve",
  "reject",
  "cancel",
  "expire",
]);

export type RequestApprovalRuntimeInput = {
  approvalKey: string;
  approvalVersion?: string;
  amount?: number | null;
  targetType?: string | null;
  targetId?: string | null;
  category?: string | null;
  priority?: string | null;
  workflowId?: string | null;
  workflowInstanceId?: string | null;
  idempotencyKey?: string;
};

async function loadDefinition(
  deps: ApprovalRuntimeDeps,
  context: EnterpriseContext,
  approvalKey: string,
  version: string,
): Promise<ApprovalDefinition> {
  const def = await deps.resolveDefinition(
    context.tenantId,
    approvalKey,
    version,
  );
  if (!def) {
    throw new ApprovalRuntimeError(
      "Definição de aprovação não encontrada.",
      APPROVAL_RUNTIME_ERROR_CODES.DEFINITION_NOT_FOUND,
    );
  }
  return def;
}

async function loadDomainRequest(
  deps: ApprovalRuntimeDeps,
  context: EnterpriseContext,
  requestId: string,
): Promise<{ persisted: PersistedApprovalRequest; domain: ApprovalRequest; definition: ApprovalDefinition }> {
  const persisted = await deps.approval.getRequest(context.tenantId, requestId);
  if (!persisted) {
    throw new ApprovalRuntimeError(
      "Solicitação não encontrada.",
      APPROVAL_RUNTIME_ERROR_CODES.NOT_FOUND,
    );
  }
  const definition = await loadDefinition(
    deps,
    context,
    persisted.approvalKey,
    persisted.approvalVersion,
  );
  const domain = toDomainApprovalRequest(persisted, definition);
  return { persisted, domain, definition };
}

async function dispatchPendingActions(
  deps: ApprovalRuntimeDeps,
  context: EnterpriseContext,
  actions: readonly ApprovalPendingAction[],
  request: ApprovalRequest,
): Promise<string[]> {
  const sideEffects: string[] = [];
  for (const action of actions) {
    if (action.type === "WRITE_AUDIT_EVENT") {
      await deps.audit.append({
        tenantId: context.tenantId,
        userId: context.userId,
        actorType: context.actorType,
        systemActorKey: context.systemActorKey,
        event: String(action.payload.event ?? "APPROVAL_DECISION_EXECUTED"),
        category: "approval",
        severity: "info",
        targetType: "approval_request",
        targetId: request.id,
        resource: null,
        module: "approval",
        description: action.description,
        metadata: action.payload as Record<string, JsonValue>,
        origin: context.source,
        correlationId: context.correlationId,
        requestId: context.requestId,
        sessionId: context.sessionId,
        ipAddress: null,
        device: null,
      });
      sideEffects.push("audit");
    } else if (
      action.type === "SEND_NOTIFICATION" ||
      action.type === "CREATE_INBOX"
    ) {
      const recipientId = context.userId ?? "system";
      const payload = buildNotificationFromRuntime({
        context,
        requestId: request.id,
        title: `Aprovação: ${action.payload.decision ?? action.type}`,
        message: action.description,
        recipientId,
        event: "APPROVAL_DECISION",
        deduplicationKey: `approval:${request.id}:${action.id}`,
      });
      const n = await deps.notification.create({
        id: newEntityId("notif"),
        tenantId: context.tenantId,
        event: payload.event,
        category: payload.category,
        priority: payload.priority,
        title: payload.title,
        message: payload.message,
        status: "queued",
        templateId: null,
        source: context.source,
        metadata: { requestId: request.id },
        correlationId: context.correlationId,
        requestId: context.requestId,
        scheduledAt: null,
        expiresAt: null,
        deduplicationKey: payload.deduplicationKey,
      });
      await deps.notification.saveRecipients([
        {
          id: newEntityId("nrec"),
          tenantId: context.tenantId,
          notificationId: n.id,
          recipientType: "user",
          recipientId,
          channel: "in_app",
          status: "queued",
          readAt: null,
          deliveredAt: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
      ]);
      sideEffects.push("notification");
    } else if (action.type === "EMIT_WORKFLOW_EVENT" && deps.workflow) {
      const instanceId = String(
        action.payload.workflowInstanceId ??
          request.context.workflowInstanceId ??
          "",
      );
      if (instanceId) {
        const instance = await deps.workflow.getInstance(
          context.tenantId,
          instanceId,
        );
        if (instance) {
          await deps.workflow.updateInstance(context.tenantId, instanceId, {
            status:
              request.status === "completed" || request.status === "approved"
                ? "completed"
                : instance.status,
            completedAt:
              request.status === "completed" ? nowIso() : instance.completedAt,
          });
          await deps.workflow.appendHistory({
            tenantId: context.tenantId,
            workflowInstanceId: instanceId,
            transitionId: null,
            event: String(action.payload.decision ?? "APPROVAL_DECIDED"),
            fromState: instance.currentState,
            toState: instance.currentState,
            actorId: context.userId,
            actorType: context.actorType,
            systemActorKey: context.systemActorKey,
            reason: action.description,
            metadata: action.payload as Record<string, JsonValue>,
            correlationId: context.correlationId,
            requestId: context.requestId,
          });
          sideEffects.push("workflow");
        }
      }
    }
  }
  return sideEffects;
}

async function persistDomainResult(
  deps: ApprovalRuntimeDeps,
  context: EnterpriseContext,
  persisted: PersistedApprovalRequest,
  domain: ApprovalRequest,
  decisionInput: ApprovalDecisionInput | null,
  operation: ApprovalRuntimeOperation,
): Promise<{ updated: PersistedApprovalRequest; sideEffects: string[] }> {
  const patch = toPersistedPatchFromDomain(persisted, domain);
  const sideEffects: string[] = [];

  const tx = await runCoordinatedTransaction(
    [
      {
        name: "update_request",
        run: async () => {
          await deps.approval.updateRequest(
            context.tenantId,
            persisted.id,
            patch,
          );
        },
      },
      {
        name: "append_decision",
        run: async () => {
          if (
            decisionInput &&
            DECISION_OPERATIONS.has(operation) &&
            ["APPROVE", "REJECT", "CANCEL", "EXPIRE"].includes(
              decisionInput.type,
            )
          ) {
            await deps.approval.appendDecision({
              tenantId: context.tenantId,
              approvalRequestId: persisted.id,
              levelId: decisionInput.levelId ?? patch.currentLevel ?? null,
              approverActorType: context.actorType,
              approverId: context.userId,
              approverSystemKey: context.systemActorKey,
              approverRole: context.roles[0] ?? null,
              decision: decisionInput.type,
              reason: decisionInput.reason ?? null,
              metadata: { ...(decisionInput.metadata ?? {}) } as Record<string, JsonValue>,
              correlationId: context.correlationId,
              requestId: context.requestId,
            });
          }
        },
      },
      {
        name: "append_history",
        run: async () => {
          const last = domain.history[domain.history.length - 1];
          if (last) {
            await deps.approval.appendHistory({
              tenantId: context.tenantId,
              approvalRequestId: persisted.id,
              previousStatus: last.fromStatus,
              newStatus: last.toStatus,
              event: decisionInput?.type ?? operation.toUpperCase(),
              actorType: context.actorType,
              actorId: context.userId,
              systemActorKey: context.systemActorKey,
              reason: decisionInput?.reason ?? last.reason,
              metadata: last.metadata as Record<string, JsonValue>,
            });
          }
        },
      },
      {
        name: "audit",
        run: async () => {
          const auditPayload = buildApprovalAuditPayload({
            operation,
            requestId: persisted.id,
            decision: decisionInput?.type ?? null,
            fromStatus: persisted.status as ApprovalRequest["status"],
            toStatus: domain.status,
            levelId: decisionInput?.levelId ?? null,
            metadata: (decisionInput?.metadata ?? {}) as Record<string, JsonValue>,
          });
          await deps.audit.append({
            tenantId: context.tenantId,
            userId: context.userId,
            actorType: context.actorType,
            systemActorKey: context.systemActorKey,
            event: auditPayload.event,
            category: auditPayload.category,
            severity: auditPayload.severity,
            targetType: auditPayload.targetType,
            targetId: auditPayload.targetId,
            resource: null,
            module: auditPayload.module,
            description: auditPayload.description,
            metadata: auditPayload.metadata,
            origin: context.source,
            correlationId: context.correlationId,
            requestId: context.requestId,
            sessionId: context.sessionId,
            ipAddress: null,
            device: null,
          });
          sideEffects.push("audit");
        },
      },
      {
        name: "outbox",
        run: async () => {
          await enqueueEnterpriseEvent(deps.outbox, {
            context,
            eventType: mapOperationToOutboxEvent(operation),
            aggregateType: "approval_request",
            aggregateId: persisted.id,
            payload: {
              decision: decisionInput?.type ?? operation,
              status: domain.status,
            },
          });
          sideEffects.push("outbox");
        },
      },
    ],
    async () => deps.approval.getRequest(context.tenantId, persisted.id),
  );

  if (!tx.ok) {
    throw new ApprovalRuntimeError(
      tx.error ?? "Falha ao persistir decisão.",
      APPROVAL_RUNTIME_ERROR_CODES.OPERATION_FAILED,
    );
  }

  const pendingEffects = await dispatchPendingActions(
    deps,
    context,
    domain.pendingActions.slice(-10),
    domain,
  );
  sideEffects.push(...pendingEffects);

  if (domain.pendingActions.length) {
    await deps.approval.savePendingActions(
      domain.pendingActions.map((a) => ({
        id: a.id,
        tenantId: context.tenantId,
        parentId: persisted.id,
        actionType: a.type,
        payload: a.payload as Record<string, JsonValue>,
        status: "pending",
        attempts: 0,
        scheduledAt: null,
        processedAt: null,
        lastError: null,
        createdAt: a.createdAt,
        updatedAt: a.createdAt,
      })),
    );
  }

  return { updated: tx.result!, sideEffects };
}

async function runWithIdempotency<T>(
  deps: ApprovalRuntimeDeps,
  context: EnterpriseContext,
  idempotencyKey: string | undefined,
  operation: string,
  request: unknown,
  run: () => Promise<T>,
): Promise<T> {
  if (!idempotencyKey) return run();
  const { result } = await executeIdempotent(deps.idempotency, {
    context,
    idempotencyKey,
    operation,
    request,
    run,
  });
  return result as T;
}

function buildResult(
  domain: ApprovalRequest,
  operation: ApprovalRuntimeOperation,
  sideEffects: string[],
): ApprovalRuntimeResult {
  return {
    ok: true,
    request: domain,
    persistedRequestId: domain.id,
    operation,
    sla: computeApprovalSla(domain),
    timeline: buildApprovalTimeline(domain),
    sideEffects,
  };
}

export function createApprovalRuntimeService(deps: ApprovalRuntimeDeps) {
  async function resolveAuth(
    context: EnterpriseContext,
  ): Promise<AuthorizationSnapshot | null> {
    if (!deps.resolveAuthorization) return null;
    return deps.resolveAuthorization(context);
  }

  return {
    async requestApproval(
      context: EnterpriseContext,
      input: RequestApprovalRuntimeInput,
    ): Promise<ApprovalRuntimeResult> {
      assertEnterpriseContext(context);
      const auth = await resolveAuth(context);
      assertRuntimePermission(auth, context, "request");
      const ctx = mergeEnterpriseRoles(context, auth);

      const run = async () => {
        const version = input.approvalVersion ?? "1.0.0";
        const definition = await loadDefinition(deps, ctx, input.approvalKey, version);
        const approvalCtx = approvalContextFromEnterprise(ctx, auth, {
          amount: input.amount,
          category: input.category,
          priority: input.priority,
          workflowId: input.workflowId,
          workflowInstanceId: input.workflowInstanceId,
        });

        const domain = createApprovalRequest({
          definition,
          context: approvalCtx,
          amount: input.amount,
          category: input.category,
          priority: input.priority,
          metadata: {},
        });

        const persisted = await deps.approval.createRequest({
          id: domain.id,
          tenantId: ctx.tenantId,
          approvalDefinitionId: definition.id,
          approvalKey: input.approvalKey,
          approvalVersion: version,
          requesterActorType: ctx.actorType,
          requesterId: ctx.userId,
          requesterSystemKey: ctx.systemActorKey,
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          amount: input.amount ?? null,
          currency: null,
          currentLevel: domain.currentLevelIds[0] ?? null,
          status: domain.status,
          data: {},
          metadata: toPersistedPatchFromDomain(
            {
              id: domain.id,
              tenantId: ctx.tenantId,
              approvalDefinitionId: definition.id,
              approvalKey: input.approvalKey,
              approvalVersion: version,
              requesterActorType: ctx.actorType,
              requesterId: ctx.userId,
              requesterSystemKey: ctx.systemActorKey,
              targetType: input.targetType ?? null,
              targetId: input.targetId ?? null,
              amount: input.amount ?? null,
              currency: null,
              currentLevel: domain.currentLevelIds[0] ?? null,
              status: domain.status,
              data: {},
              metadata: {},
              correlationId: ctx.correlationId,
              expiresAt: null,
              completedAt: null,
              createdAt: domain.createdAt,
              updatedAt: domain.updatedAt,
            },
            domain,
          ).metadata ?? {},
          correlationId: ctx.correlationId,
          expiresAt: null,
          completedAt: null,
        });

        await deps.audit.append({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          actorType: ctx.actorType,
          systemActorKey: ctx.systemActorKey,
          event: "APPROVAL_REQUESTED",
          category: "approval",
          severity: "info",
          targetType: "approval_request",
          targetId: persisted.id,
          resource: null,
          module: "approval",
          description: "Solicitação criada",
          metadata: { approvalKey: input.approvalKey },
          origin: ctx.source,
          correlationId: ctx.correlationId,
          requestId: ctx.requestId,
          sessionId: ctx.sessionId,
          ipAddress: null,
          device: null,
        });

        await enqueueEnterpriseEvent(deps.outbox, {
          context: ctx,
          eventType: "APPROVAL_REQUESTED",
          aggregateType: "approval_request",
          aggregateId: persisted.id,
          payload: { approvalKey: input.approvalKey, amount: input.amount ?? null },
        });

        const notif = buildNotificationFromRuntime({
          context: ctx,
          requestId: persisted.id,
          title: "Nova solicitação de aprovação",
          message: `Solicitação ${input.approvalKey} aguardando decisão.`,
          recipientId: ctx.userId ?? "system",
          event: "APPROVAL_REQUESTED",
          deduplicationKey: `approval:requested:${persisted.id}`,
        });
        const n = await deps.notification.create({
          id: newEntityId("notif"),
          tenantId: ctx.tenantId,
          event: notif.event,
          category: notif.category,
          priority: notif.priority,
          title: notif.title,
          message: notif.message,
          status: "queued",
          templateId: null,
          source: ctx.source,
          metadata: { requestId: persisted.id },
          correlationId: ctx.correlationId,
          requestId: ctx.requestId,
          scheduledAt: null,
          expiresAt: null,
          deduplicationKey: notif.deduplicationKey,
        });
        await deps.notification.saveRecipients([
          {
            id: newEntityId("nrec"),
            tenantId: ctx.tenantId,
            notificationId: n.id,
            recipientType: "user",
            recipientId: ctx.userId ?? "system",
            channel: "in_app",
            status: "queued",
            readAt: null,
            deliveredAt: null,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          },
        ]);

        return buildResult(domain, "request", [
          "audit",
          "outbox",
          "notification",
        ]);
      };

      return runWithIdempotency(
        deps,
        ctx,
        input.idempotencyKey,
        "approval.runtime.request",
        input,
        run,
      );
    },

    async decide(
      context: EnterpriseContext,
      input: {
        requestId: string;
        decision: ApprovalDecisionInput;
        idempotencyKey?: string;
      },
      operation: ApprovalRuntimeOperation = input.decision.type === "REJECT"
        ? "reject"
        : "approve",
    ): Promise<ApprovalRuntimeResult> {
      assertEnterpriseContext(context);
      const auth = await resolveAuth(context);
      assertRuntimePermission(auth, context, operation);
      const ctx = mergeEnterpriseRoles(context, auth);

      const run = async () => {
        const { persisted, domain, definition } = await loadDomainRequest(
          deps,
          ctx,
          input.requestId,
        );
        const approvalCtx = approvalContextFromEnterprise(ctx, auth, {
          amount: domain.amount,
          category: domain.category,
          workflowInstanceId: domain.context.workflowInstanceId,
          workflowId: domain.context.workflowId,
        });

        const result = runApprovalDecision(
          definition,
          domain,
          input.decision,
          approvalCtx,
        );

        if (!result.ok) {
          throw new ApprovalRuntimeError(
            result.error,
            APPROVAL_RUNTIME_ERROR_CODES.VALIDATION_FAILED,
          );
        }

        const { sideEffects } = await persistDomainResult(
          deps,
          ctx,
          persisted,
          result.request,
          input.decision,
          operation,
        );

        return buildResult(result.request, operation, sideEffects);
      };

      return runWithIdempotency(
        deps,
        ctx,
        input.idempotencyKey,
        `approval.runtime.${operation}`,
        input,
        run,
      );
    },

    approve(
      context: EnterpriseContext,
      input: {
        requestId: string;
        levelId?: string | null;
        comment?: string | null;
        idempotencyKey?: string;
      },
    ) {
      return this.decide(
        context,
        {
          requestId: input.requestId,
          idempotencyKey: input.idempotencyKey,
          decision: {
            type: "APPROVE",
            levelId: input.levelId,
            comment: input.comment,
          },
        },
        "approve",
      );
    },

    reject(
      context: EnterpriseContext,
      input: {
        requestId: string;
        levelId?: string | null;
        reason?: string | null;
        idempotencyKey?: string;
      },
    ) {
      return this.decide(
        context,
        {
          requestId: input.requestId,
          idempotencyKey: input.idempotencyKey,
          decision: {
            type: "REJECT",
            levelId: input.levelId,
            reason: input.reason,
          },
        },
        "reject",
      );
    },

    cancel(
      context: EnterpriseContext,
      input: { requestId: string; reason?: string | null; idempotencyKey?: string },
    ) {
      return this.decide(
        context,
        {
          requestId: input.requestId,
          idempotencyKey: input.idempotencyKey,
          decision: { type: "CANCEL", reason: input.reason },
        },
        "cancel",
      );
    },

    expire(
      context: EnterpriseContext,
      input: { requestId: string; idempotencyKey?: string },
    ) {
      return this.decide(
        context,
        {
          requestId: input.requestId,
          idempotencyKey: input.idempotencyKey,
          decision: { type: "EXPIRE", reason: "SLA expired" },
        },
        "expire",
      );
    },

    async delegate(
      context: EnterpriseContext,
      input: DelegateApprovalInput,
    ): Promise<ApprovalRuntimeResult> {
      assertEnterpriseContext(context);
      const auth = await resolveAuth(context);
      assertRuntimePermission(auth, context, "delegate");
      const ctx = mergeEnterpriseRoles(context, auth);

      const run = async () => {
        const { persisted, domain, definition } = await loadDomainRequest(
          deps,
          ctx,
          input.requestId,
        );
        const now = nowIso();
        let next = appendApprovalHistory(domain, {
          at: now,
          decision: null,
          levelId: domain.currentLevelIds[0] ?? null,
          fromStatus: domain.status,
          toStatus: domain.status,
          actor: {
            userId: ctx.userId,
            roles: ctx.roles,
            permissions: ctx.permissions,
            type: "user",
          },
          comment: input.comment ?? null,
          reason: "DELEGATED",
          metadata: {
            delegated: true,
            delegateTo: input.delegateToUserId,
            originalOwner: ctx.userId,
          },
        });

        next = {
          ...next,
          metadata: {
            ...next.metadata,
            delegateTo: input.delegateToUserId,
            originalOwner: ctx.userId,
          },
          updatedAt: now,
        };

        const { sideEffects } = await persistDomainResult(
          deps,
          ctx,
          persisted,
          next,
          null,
          "delegate",
        );

        const ownerNotif = buildNotificationFromRuntime({
          context: ctx,
          requestId: persisted.id,
          title: "Aprovação delegada",
          message: `Delegada para ${input.delegateToUserId}.`,
          recipientId: input.delegateToUserId,
          event: "APPROVAL_DELEGATED",
          deduplicationKey: `approval:delegate:${persisted.id}:${input.delegateToUserId}`,
        });
        const n = await deps.notification.create({
          id: newEntityId("notif"),
          tenantId: ctx.tenantId,
          event: ownerNotif.event,
          category: ownerNotif.category,
          priority: ownerNotif.priority,
          title: ownerNotif.title,
          message: ownerNotif.message,
          status: "queued",
          templateId: null,
          source: ctx.source,
          metadata: { requestId: persisted.id },
          correlationId: ctx.correlationId,
          requestId: ctx.requestId,
          scheduledAt: null,
          expiresAt: null,
          deduplicationKey: ownerNotif.deduplicationKey,
        });
        await deps.notification.saveRecipients([
          {
            id: newEntityId("nrec"),
            tenantId: ctx.tenantId,
            notificationId: n.id,
            recipientType: "user",
            recipientId: input.delegateToUserId,
            channel: "in_app",
            status: "queued",
            readAt: null,
            deliveredAt: null,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          },
        ]);
        sideEffects.push("notification");

        if (ctx.userId) {
          sideEffects.push("notification_owner");
        }

        void definition;
        return buildResult(next, "delegate", sideEffects);
      };

      return runWithIdempotency(
        deps,
        ctx,
        input.idempotencyKey,
        "approval.runtime.delegate",
        input,
        run,
      );
    },

    async escalate(
      context: EnterpriseContext,
      input: EscalateApprovalInput,
    ): Promise<ApprovalRuntimeResult> {
      assertEnterpriseContext(context);
      const auth = await resolveAuth(context);
      assertRuntimePermission(auth, context, "escalate");
      const ctx = mergeEnterpriseRoles(context, auth);

      const run = async () => {
        const { persisted, domain, definition } = await loadDomainRequest(
          deps,
          ctx,
          input.requestId,
        );

        const currentLevelId = domain.currentLevelIds[0] ?? null;
        const currentLevel = definition.levels.find(
          (l) => l.id === currentLevelId,
        );
        const targetLevelId =
          input.targetLevelId ??
          currentLevel?.escalateToLevelId ??
          definition.levels.find((l) => l.order > (currentLevel?.order ?? 0))
            ?.id ??
          null;

        if (!targetLevelId) {
          throw new ApprovalRuntimeError(
            "Nível de escalonamento não configurado.",
            APPROVAL_RUNTIME_ERROR_CODES.INVALID_STATE,
          );
        }

        const now = nowIso();
        let next: ApprovalRequest = {
          ...domain,
          currentLevelIds: [targetLevelId],
          levelProgress: domain.levelProgress.map((p) =>
            p.levelId === targetLevelId
              ? { ...p, status: "pending" }
              : p.levelId === currentLevelId
                ? { ...p, status: "skipped" }
                : p,
          ),
          updatedAt: now,
        };

        next = appendApprovalHistory(next, {
          at: now,
          decision: null,
          levelId: targetLevelId,
          fromStatus: domain.status,
          toStatus: domain.status,
          actor: {
            userId: ctx.userId,
            roles: ctx.roles,
            permissions: ctx.permissions,
            type: ctx.actorType === "user" ? "user" : "system",
          },
          comment: input.reason ?? null,
          reason: "ESCALATED",
          metadata: { escalated: true, fromLevel: currentLevelId, targetLevelId },
        });

        const { sideEffects } = await persistDomainResult(
          deps,
          ctx,
          persisted,
          next,
          null,
          "escalate",
        );

        return buildResult(next, "escalate", sideEffects);
      };

      return runWithIdempotency(
        deps,
        ctx,
        input.idempotencyKey,
        "approval.runtime.escalate",
        input,
        run,
      );
    },

    async reopen(
      context: EnterpriseContext,
      input: { requestId: string; reason?: string | null; idempotencyKey?: string },
    ): Promise<ApprovalRuntimeResult> {
      assertEnterpriseContext(context);
      const auth = await resolveAuth(context);
      assertRuntimePermission(auth, context, "reopen");
      const ctx = mergeEnterpriseRoles(context, auth);

      const run = async () => {
        const { persisted, domain, definition } = await loadDomainRequest(
          deps,
          ctx,
          input.requestId,
        );

        if (!domain.sla?.allowReopen && domain.status !== "returned") {
          throw new ApprovalRuntimeError(
            "Reabertura não permitida para esta solicitação.",
            APPROVAL_RUNTIME_ERROR_CODES.INVALID_STATE,
          );
        }

        const now = nowIso();
        let next: ApprovalRequest = {
          ...domain,
          status: "pending",
          decidedAt: null,
          currentLevelIds: domain.levelProgress
            .filter((p) => p.status === "waiting" || p.status === "pending")
            .map((p) => p.levelId)
            .slice(0, 1),
          updatedAt: now,
        };

        next = appendApprovalHistory(next, {
          at: now,
          decision: null,
          levelId: next.currentLevelIds[0] ?? null,
          fromStatus: domain.status,
          toStatus: "pending",
          actor: {
            userId: ctx.userId,
            roles: ctx.roles,
            permissions: ctx.permissions,
            type: "user",
          },
          comment: input.reason ?? null,
          reason: "REOPENED",
          metadata: { reopened: true },
        });

        const { sideEffects } = await persistDomainResult(
          deps,
          ctx,
          persisted,
          next,
          null,
          "reopen",
        );

        void definition;
        return buildResult(next, "reopen", sideEffects);
      };

      return runWithIdempotency(
        deps,
        ctx,
        input.idempotencyKey,
        "approval.runtime.reopen",
        input,
        run,
      );
    },

    async retryPending(
      context: EnterpriseContext,
      input: { requestId: string; idempotencyKey?: string },
    ): Promise<ApprovalRuntimeResult> {
      assertEnterpriseContext(context);
      const auth = await resolveAuth(context);
      assertRuntimePermission(auth, context, "retry");
      const ctx = mergeEnterpriseRoles(context, auth);

      const run = async () => {
        const { persisted, domain } = await loadDomainRequest(
          deps,
          ctx,
          input.requestId,
        );
        const now = nowIso();
        const next = appendApprovalHistory(
          { ...domain, updatedAt: now },
          {
            at: now,
            decision: null,
            levelId: domain.currentLevelIds[0] ?? null,
            fromStatus: domain.status,
            toStatus: domain.status,
            actor: {
              userId: ctx.userId,
              roles: ctx.roles,
              permissions: ctx.permissions,
              type: "user",
            },
            comment: null,
            reason: "RETRY",
            metadata: { retry: true },
          },
        );

        const { sideEffects } = await persistDomainResult(
          deps,
          ctx,
          persisted,
          next,
          null,
          "retry",
        );

        return buildResult(next, "retry", sideEffects);
      };

      return runWithIdempotency(
        deps,
        ctx,
        input.idempotencyKey,
        "approval.runtime.retry",
        input,
        run,
      );
    },

    resolveNextStep(request: ApprovalRequest) {
      return resolveNextStep(request);
    },

    computeSla(request: ApprovalRequest) {
      return computeApprovalSla(request);
    },

    shouldAutoEscalate(request: ApprovalRequest, now?: string | Date) {
      return shouldEscalateBySla(request, now);
    },

    async list(
      context: EnterpriseContext,
      filters: ApprovalRuntimeFilters & {
        page?: number;
        limit?: number;
        orderBy?: "createdAt" | "updatedAt";
        orderDir?: "asc" | "desc";
      } = {},
    ): Promise<{
      items: ApprovalRuntimeListItem[];
      total: number;
      page: number;
      limit: number;
    }> {
      assertEnterpriseContext(context);
      const auth = await resolveAuth(context);
      assertRuntimePermission(auth, context, "resolve_next");

      const listFn =
        deps.listRequests ??
        (
          deps.approval as ApprovalRepository & {
            listRequests?: (
              query: ApprovalListRequestsQuery,
            ) => Promise<ApprovalListRequestsResult>;
          }
        ).listRequests;

      const page = Math.max(1, filters.page ?? 1);
      const limit = Math.min(100, Math.max(1, filters.limit ?? 25));

      const query: ApprovalListRequestsQuery = {
        tenantId: context.tenantId,
        status: filters.status ?? null,
        priority: filters.priority ?? null,
        approverId: filters.approverId ?? null,
        requesterId: filters.requesterId ?? null,
        workflowId: filters.workflowId ?? null,
        module: filters.module ?? null,
        dateFrom: filters.dateFrom ?? null,
        dateTo: filters.dateTo ?? null,
        page,
        limit,
        orderBy: filters.orderBy ?? "createdAt",
        orderDir: filters.orderDir ?? "desc",
      };

      const listed = listFn
        ? await listFn(query)
        : { items: [] as PersistedApprovalRequest[], total: 0, page, limit };

      const items: ApprovalRuntimeListItem[] = [];
      for (const row of listed.items) {
        if (row.tenantId !== context.tenantId) continue;
        const definition = await deps.resolveDefinition(
          context.tenantId,
          row.approvalKey,
          row.approvalVersion,
        );
        if (!definition) continue;
        const domain = toDomainApprovalRequest(row, definition);
        items.push({
          request: domain,
          definition,
          sla: computeApprovalSla(domain),
          summary: (await import("../approval-timeline.ts")).summarizeApproval(
            domain,
          ),
        });
      }

      return {
        items: filterRuntimeItems(items, {
          ...filters,
          tenantId: context.tenantId,
        }),
        total: listed.total,
        page: listed.page,
        limit: listed.limit,
      };
    },

    computeKpis(items: ApprovalRuntimeListItem[]): ApprovalRuntimeKpis {
      return computeApprovalKpis(items);
    },

    buildTimeline(request: ApprovalRequest) {
      return buildApprovalTimeline(request);
    },
  };
}

export type ApprovalRuntimeService = ReturnType<
  typeof createApprovalRuntimeService
>;
