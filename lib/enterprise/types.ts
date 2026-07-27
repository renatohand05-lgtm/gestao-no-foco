/**
 * Sprint 21.6 — Tipos centrais da camada Enterprise Persistence & Integration.
 * Domínio de integração · sem React · sem I/O direto.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type EnterpriseActorType = "user" | "system" | "service" | "integration";

export type EnterpriseSource =
  | "api"
  | "server_action"
  | "job"
  | "integration"
  | "test"
  | "unknown";

export type EnterpriseContext = {
  tenantId: string;
  userId: string | null;
  actorType: EnterpriseActorType;
  /** Obrigatório quando actorType ≠ user */
  systemActorKey: string | null;
  sessionId: string | null;
  requestId: string;
  correlationId: string;
  source: EnterpriseSource;
  roles: readonly string[];
  permissions: readonly string[];
  metadata: Record<string, JsonValue>;
};

export type OutboxStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "dead";

export type OutboxEventType =
  | "APPROVAL_REQUESTED"
  | "APPROVAL_DECIDED"
  | "WORKFLOW_TRANSITIONED"
  | "WORKFLOW_TRANSITION_EXECUTED"
  | "AUDIT_EVENT_CREATED"
  | "AUDIT_EVENT_REQUESTED"
  | "NOTIFICATION_REQUESTED"
  | "SECURITY_DECISION_RECORDED"
  | "AUTHORIZATION_DENIED";

export type EnterpriseOutboxEvent = {
  id: string;
  tenantId: string;
  eventType: OutboxEventType | string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, JsonValue>;
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  correlationId: string | null;
  requestId: string | null;
  availableAt: string;
  lockedAt: string | null;
  lockedBy: string | null;
  processedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IdempotencyStatus = "pending" | "completed" | "failed";

export type IdempotencyRecord = {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  operation: string;
  requestHash: string;
  responseSnapshot: Record<string, JsonValue> | null;
  status: IdempotencyStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EnterpriseHealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export type EnterpriseHealthSnapshot = {
  status: EnterpriseHealthStatus;
  checkedAt: string;
  database: {
    connected: boolean;
    message: string;
  };
  outbox: {
    pending: number;
    failed: number;
    processing: number;
  };
  workflows: {
    blocked: number;
  };
  approvals: {
    expired: number;
  };
  notifications: {
    failed: number;
  };
  audit: {
    writeFailures: number;
  };
  idempotency: {
    conflicts: number;
  };
  details: string[];
};

export type TransactionStepResult = {
  name: string;
  ok: boolean;
  error?: string;
};

export type TransactionResult<T = unknown> = {
  ok: boolean;
  result?: T;
  steps: TransactionStepResult[];
  rolledBack: boolean;
  error?: string;
};

export type IntegrationHandlerResult = {
  ok: boolean;
  handled: boolean;
  message: string;
  sideEffects?: string[];
};

export type IntegrationHandler = (input: {
  event: EnterpriseOutboxEvent;
  context: EnterpriseContext;
}) => Promise<IntegrationHandlerResult> | IntegrationHandlerResult;
