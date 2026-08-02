/**
 * Sprint 21.6 — Enterprise Persistence & Integration Layer · API pública.
 * Sprint 29.6 — + Enterprise Intelligence Engine (única entrada oficial de inteligência).
 *
 * Domain engines (rbac/audit/workflow/approval/notifications) NÃO importam Supabase.
 * Persistência: Repository/Adapter → Supabase.
 * Inteligência: preferir imports deste barrel (ou `./intelligence`) em app/components.
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
  createIdempotencySupabaseAdapter,
} from "./adapters/index.ts";

export {
  createAuditService,
  createWorkflowService,
  createApprovalService,
  createNotificationService,
  createAuthorizationService,
  type EnterpriseRepos,
} from "./services/index.ts";

/** Sprint 29.6 — Enterprise Intelligence Engine. */
export {
  composeEnterpriseInsights,
  runEnterpriseEngine,
  presentEnterpriseInsightCards,
  resolveNamedScores,
  buildCriticalIndicators,
  runExecutiveAiEngine,
  runBusinessHealthEngine,
  BusinessHealthEngine,
  classifyBusinessHealthStatus,
  BUSINESS_HEALTH_STATUS_LABEL,
  BUSINESS_HEALTH_CONFIDENCE_LABEL,
  composeOpsExecutiveIntelligence,
  composeCommercialExecutiveIntelligence,
  toExecutiveIntelligenceInput,
  buildExecutiveAction,
  buildExecutiveScore,
  buildExecutiveHealth,
  buildExecutiveInsights,
  buildExecutiveDiagnosis,
  buildExecutiveTimeline,
  ENTERPRISE_INTELLIGENCE_VERSION,
} from "./intelligence.ts";

export type {
  EnterpriseInsightsPack,
  EnterpriseNamedScores,
  EnterpriseRecommendation,
  EnterpriseInsightCard,
  ExecutiveIntelligencePack,
  ExecutiveNamedScores,
  RecommendationBlueprint,
  BusinessHealthResult,
  BusinessHealthModuleResult,
  BusinessHealthStatus,
  BusinessHealthPriorityItem,
  BusinessHealthEvidenceItem,
  BusinessHealthConfidenceLevel,
  ExecutiveAiResult,
  ExecutiveAiInput,
  ExecutiveIntelligenceData,
  ExecutiveIntelligenceFeeds,
  CriticalIndicator,
} from "./intelligence-contracts.ts";
