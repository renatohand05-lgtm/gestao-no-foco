/**
 * Sprint 22.5.1 — Import Engine consolidada.
 * Motor único (parsers/segurança/mapeamento/classificação/preview/histórico/
 * commit) reutilizado por Financeiro, Vendas e Ordens de Serviço via
 * adapters/. Todos os exports da Sprint 22.5 continuam funcionando
 * (compatibilidade retroativa garantida).
 */

export * from "./types/index.ts";

/* ————————————————— Parsing ————————————————— */
export {
  parseImportFile,
  supportedExtensions,
} from "./parsers/index.ts";
export {
  detectFormatFromFileName,
  detectFormatFromMime,
  assertSupportedFormat,
} from "./parsers/detect-format.ts";
export { parsePdfBuffer, parsePdfBufferWithPreview } from "./parsers/pdf-parser.ts";
export {
  extractPdfText,
  validatePdfSignature,
  PdfCorruptedError,
} from "./parsers/pdf-text-extractor.ts";
export { parseOfxBuffer, parseOfxText } from "./parsers/ofx-parser.ts";
export {
  parseFinanceXmlSafe,
  parseFinanceXmlBuffer,
  assertXmlSafeContent,
  XmlSecurityError,
  XmlStructureError,
} from "./parsers/xml-finance-parser.ts";
export {
  isCnabSupported,
  createCnabPreparingContract,
  CNAB_PREPARING_MESSAGE,
} from "./parsers/cnab-contract.ts";
export { parseClipboardPayload } from "./parsers/clipboard-input.ts";
export {
  detectCsvInjection,
  sanitizeCsvCell,
  neutralizeCsvCellForExport,
} from "./parsers/csv-security.ts";
export {
  getEnterpriseFeatureFlags,
  isExternalAiEnabled,
  isOcrEnabled,
  isCnabEnabled,
  isConnectorsSpecificEnabled,
  isWebhooksEnabled,
  isAutoSyncEnabled,
  isImportApiEnabled,
  isAsyncProcessingEnabled,
} from "./enterprise-feature-flags.ts";
export type { EnterpriseFeatureFlags } from "./enterprise-feature-flags.ts";
export {
  EnterpriseImportError,
  ENTERPRISE_IMPORT_ERROR_CODES,
  enterpriseImportErrorFromApiCode,
  isEnterpriseImportError,
  toSafeClientMessage,
  type EnterpriseImportErrorCategory,
  type EnterpriseImportErrorCode,
} from "./errors/enterprise-import-errors.ts";
export {
  IMPORT_EVENT_NAMES,
  buildImportCorrelationId,
  emitImportEvent,
  sanitizeImportEventPayload,
  setImportEventSink,
  type ImportEventName,
  type ImportEventOutcome,
  type ImportEventPayload,
  type ImportEventRecord,
} from "./observability/import-events.ts";
export {
  listConnectorDefinitions,
  getConnectorDefinition,
  allConnectorsPreparing,
  isConnectorLive,
  CONNECTOR_REGISTRY,
} from "./connectors/registry.ts";
export type {
  EnterpriseDataConnector,
  ConnectorRegistryEntry,
  ConnectorStatus,
} from "./connectors/types.ts";
export {
  verifyWebhookSignature,
  signWebhookPayload,
  isDuplicateIdempotencyKey,
  registerIdempotencyKey,
  buildIdempotencyKey,
  resetWebhookIdempotencyCache,
} from "./connectors/webhook-security.ts";
export {
  createApiErrorResponse,
  validateApiAuthConfigured,
  verifyApiBearerToken,
  assertTenantIsolation,
  checkApiRateLimit,
  resetApiRateLimits,
  API_VERSION,
} from "./connectors/api-contract.ts";
export type { ApiErrorBody, ApiErrorCode } from "./connectors/api-contract.ts";
export {
  normalizeHeader,
  normalizeText,
  parseBrazilianOrAmericanNumber,
  parseFlexibleDate,
  fingerprintRow,
} from "./parsers/normalize.ts";

/* ————————————————— Segurança (novo — Sprint 22.5.1) ————————————————— */
export {
  validateImportFileSecurity,
  assertImportFileSecurity,
  NoopAntivirusScanner,
  createAntivirusScannerPlaceholder,
  type ValidateImportFileSecurityInput,
  type AntivirusScanner,
  type AntivirusScanResult,
} from "./security/index.ts";

/* ————————————————— Mapeamento ————————————————— */
export {
  suggestColumnMapping,
  unknownSourceColumns,
  mappingCoverageScore,
  headersLookAlike,
  FIELD_ALIASES,
} from "./mapping/auto-map.ts";
export {
  MemoryImportMappingStore,
  getGlobalMemoryMappingStore,
  type ImportMappingStore,
  type SaveImportMappingInput,
} from "./mapping/mapping-store.ts";
export { computeMappingConfidence } from "./mapping/mapping-confidence.ts";

/* ————————————————— Validação ————————————————— */
export {
  normalizeMappedRows,
  validateMapping,
} from "./validators/row-validator.ts";

/* ————————————————— Classificação (movido — Sprint 22.5.1) ————————————————— */
export {
  classifyDescription,
  classifyRows,
  rulesForDomain,
  DEFAULT_CLASSIFICATION_RULES,
  FINANCE_CLASSIFICATION_RULES,
  SALES_CLASSIFICATION_RULES,
  SERVICE_ORDERS_CLASSIFICATION_RULES,
  RuleClassificationProvider,
  createDefaultClassificationProvider,
  type ClassificationRule,
  type ClassifyOptions,
  type ClassificationProvider,
} from "./classification/index.ts";

/* ————————————————— Preview ————————————————— */
export { buildImportPreview } from "./preview/build-preview.ts";

/* ————————————————— Commit ————————————————— */
export { commitImportRows } from "./importers/commit-pipeline.ts";

/* ————————————————— Histórico (movido — Sprint 22.5.1) ————————————————— */
export {
  MemoryImportHistoryStore,
  getGlobalMemoryHistoryStore,
  type ImportHistoryStore,
  type ImportHistoryListPageOptions,
  type ImportHistoryListPageResult,
} from "./history/import-history-store.ts";
export {
  MemoryImportRunItemsStore,
  getGlobalMemoryRunItemsStore,
  type ImportRunItemsStore,
  type AppendImportRunItemInput,
} from "./history/run-items-store.ts";

/* ————————————————— Aprendizado (novo — Sprint 22.6) ————————————————— */
export {
  MemoryImportLearningStore,
  getGlobalMemoryLearningStore,
  fingerprintDescription,
  buildLearningPatterns,
  matchLearningRules,
  type ImportLearningStore,
  type UpsertLearningRuleInput,
} from "./learning/learning-store.ts";
export { classifyRowsWithLearning } from "./learning/apply-learning.ts";

/* ————————————————— Classificação assistida (Sprint 22.7) ————————————————— */
export {
  createFinancialIntelligenceProvider,
  createDeterministicProvider,
  createMockProvider,
  detectDocumentKind,
  interpretDreLines,
  interpretPayrollRows,
  classifyWithPriority,
  scanImportedContent,
  assessDuplicate,
  explainClassification,
  buildReviewQueue,
  applyReviewDecision,
  resolveLearningMaturity,
  assertNoSilentLowConfidenceConfirm,
  DETERMINISTIC_ATTRIBUTION,
} from "./assisted-intelligence/index.ts";

/* ————————————————— Rollback (funcional — Sprint 22.6) ————————————————— */
export {
  MemoryImportRollbackStore,
  getGlobalMemoryRollbackStore,
  canRollbackCore,
  prepareRollbackCore,
  executeRollbackCore,
  type ImportRollbackStore,
  type ImportRollbackEvent,
  type ImportRollbackEventStatus,
  type RecordRollbackEvent,
} from "./rollback/rollback-store.ts";

/* ————————————————— Persistência Supabase (novo — Sprint 22.6) ————————————————— */
export { createSupabaseHistoryStore } from "./persistence/supabase-history-store.ts";
export { createSupabaseMappingStore } from "./persistence/supabase-mapping-store.ts";
export { createSupabaseLearningStore } from "./persistence/supabase-learning-store.ts";
export { createSupabaseRunItemsStore } from "./persistence/supabase-run-items-store.ts";
export {
  createSupabaseRollbackStore,
  type SupabaseRollbackStoreDeps,
} from "./persistence/supabase-rollback-store.ts";
export {
  createSupabaseImportEngine,
  type ImportEngineBundle,
} from "./persistence/create-supabase-import-engine.ts";
export {
  createImportEngine,
  createProductionImportEngine,
  createMemoryImportEngineBundle,
} from "./persistence/create-import-engine.ts";
export {
  assertImportMemoryUsageAllowed,
  isImportMemoryExplicitlyAllowed,
  isImportProductionRuntime,
  STAGING_MEMORY_REASON,
  WIZARD_SESSION_MEMORY_REASON,
} from "./persistence/memory-policy.ts";

/* ————————————————— Staging genérico (novo — Sprint 22.5.1) ————————————————— */
export {
  MemoryImportStagingStore,
  getGlobalMemoryStagingStore,
  type ImportStagingStore,
  type StagedImportRow,
} from "./shared/staging-store.ts";
export {
  putImportWizardSession,
  getImportWizardSession,
  newImportWizardSessionId,
  type ImportWizardSession,
} from "./shared/wizard-session-store.ts";

/* ————————————————— Adapters de módulo (novo — Sprint 22.5.1) ————————————————— */
export type { ModuleImportAdapter } from "./adapters/shared/module-adapter.ts";
export { FINANCE_IMPORT_ADAPTER } from "./adapters/finance/adapter.ts";
export {
  FINANCE_IMPORT_MODULE,
  FINANCE_IMPORT_ENTITY,
  FINANCE_MOVEMENT_IMPORT_FIELDS,
} from "./adapters/finance/fields.ts";
export { SALES_IMPORT_ADAPTER } from "./adapters/sales/adapter.ts";
export {
  SALES_IMPORT_MODULE,
  SALES_IMPORT_ENTITY,
  SALES_IMPORT_FIELDS,
} from "./adapters/sales/fields.ts";
export { SERVICE_ORDERS_IMPORT_ADAPTER } from "./adapters/service-orders/adapter.ts";
export {
  SERVICE_ORDERS_IMPORT_MODULE,
  SERVICE_ORDERS_IMPORT_ENTITY,
  SERVICE_ORDERS_IMPORT_FIELDS,
} from "./adapters/service-orders/fields.ts";
export { getImportAdapter, listImportAdapters } from "./adapters/registry.ts";

/* ————————————————— Serviço orquestrador ————————————————— */
export { ImportEngineService } from "./services/import-engine-service.ts";

import { getGlobalMemoryHistoryStore } from "./history/import-history-store.ts";
import { getGlobalMemoryMappingStore } from "./mapping/mapping-store.ts";
import { ImportEngineService } from "./services/import-engine-service.ts";
import { assertImportMemoryUsageAllowed } from "./persistence/memory-policy.ts";

/** Apenas testes / ALLOW_IMPORT_MEMORY — produção deve usar createProductionImportEngine. */
export function createMemoryImportEngine(
  explicitReason = "test_or_explicit_memory_engine",
): ImportEngineService {
  assertImportMemoryUsageAllowed(explicitReason);
  return new ImportEngineService(
    getGlobalMemoryMappingStore(),
    getGlobalMemoryHistoryStore(),
  );
}
