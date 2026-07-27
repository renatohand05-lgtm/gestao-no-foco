/**
 * Sprint 21.6 — Enterprise Persistence & Integration Layer · API pública.
 *
 * Domain engines (rbac/audit/workflow/approval/notifications) NÃO importam Supabase.
 * Persistência: Repository/Adapter → Supabase.
 */

export type * from "./types.ts";

export {
  createEnterpriseContext,
  normalizeEnterpriseContext,
  validateEnterpriseContext,
  assertEnterpriseContext,
  assertSameTenant,
  actorRefFromContext,
  type CreateEnterpriseContextInput,
} from "./context.ts";

export {
  ENTERPRISE_ACTOR_TYPES,
  SYSTEM_ACTOR_KEYS,
  createUserActor,
  createSystemActor,
  validateActorRef,
  assertActorRef,
  actorFromEnterpriseContext,
  type EnterpriseActorRef,
  type EnterpriseActorTypeId,
  type SystemActorKey,
} from "./actors.ts";

export {
  ENTERPRISE_ERROR_CODES,
  EnterpriseError,
  EnterpriseContextError,
  EnterpriseIdempotencyError,
  EnterprisePersistenceError,
  isEnterpriseError,
  toSafeEnterpriseError,
  type EnterpriseErrorCode,
} from "./errors.ts";

export {
  ensureCorrelationId,
  withCorrelation,
  stableHash,
} from "./correlation.ts";

export {
  mapKeysCamelToSnake,
  mapKeysSnakeToCamel,
  snakeToCamelKey,
  camelToSnakeKey,
  nowIso,
  newEntityId,
} from "./mappers.ts";

export {
  runCoordinatedTransaction,
  assertTransactionOk,
  type TransactionStep,
} from "./transaction.ts";

export {
  enqueueEnterpriseEvent,
  claimOutboxBatch,
  markOutboxCompleted,
  markOutboxFailed,
  processOutboxEvent,
  createOutboxEventDraft,
  assertOutboxTenant,
  type EnqueueEnterpriseEventInput,
} from "./outbox.ts";

export {
  executeIdempotent,
  checkIdempotencyKey,
  storeIdempotentResult,
  type ExecuteIdempotentInput,
} from "./idempotency.ts";

export { EnterpriseEventBus, enterpriseEventBus } from "./event-bus.ts";

export {
  registerDefaultIntegrationHandlers,
  runIntegrationHandlers,
  createIntegrationService,
  type IntegrationRunnerDeps,
} from "./integration-runner.ts";

export { getEnterpriseHealth, type HealthDeps } from "./health.ts";

export * from "./repositories/index.ts";

export {
  createAuditSupabaseAdapter,
  createWorkflowSupabaseAdapter,
  createApprovalSupabaseAdapter,
  createNotificationSupabaseAdapter,
  createRbacSupabaseAdapter,
  createOutboxSupabaseAdapter,
} from "./adapters/index.ts";

export {
  createAuditService,
  createWorkflowService,
  createApprovalService,
  createNotificationService,
  createAuthorizationService,
  type EnterpriseRepos,
} from "./services/index.ts";
