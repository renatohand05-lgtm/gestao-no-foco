/**
 * Fase 24 / Sprint 24.1 — CRM Enterprise · API pública.
 * Reutiliza cadastro `clientes` e serviços Sprint 14 — sem segunda base.
 */

export {
  CRM_FUNIL_STAGES,
  CRM_FUNIL_LABELS,
  CRM_FUNIL_COLORS,
  CRM_TAREFA_TIPOS,
  CRM_AGENDA_TIPOS,
  CRM_CLASSIFICACOES,
  type CrmFunilStage,
} from "./constants.ts";

export {
  isCrmEnterpriseEnabled,
  isCrmExternalAiEnabled,
  isCrmExternalIntegrationsEnabled,
  getCrmFeatureFlags,
} from "./crm-feature-flags.ts";

export type * from "./enterprise/types.ts";
export { CRM_KPI_CATALOG, getCrmKpiDefinition } from "./enterprise/kpi-catalog.ts";
export {
  resolveCrmKpi,
  resolveCrmCatalogKpis,
  buildCrmDrillDown,
  buildCrmKpiDrillDownFromSnapshot,
} from "./enterprise/kpi-engine.ts";
export {
  defaultPipelineStages,
  mergePipelineStages,
  assertPipelineStage,
  isValidPipelineTransition,
} from "./enterprise/pipeline-config.ts";
export { buildCrmAlerts, dedupeCrmAlerts } from "./enterprise/alert-engine.ts";
export {
  deterministicCommercialProvider,
  externalCommercialStubProvider,
  mockCommercialProvider,
  resolveCommercialProvider,
} from "./enterprise/commercial-ai-provider.ts";
export {
  describeCrmIntegrationArchitecture,
  listCrmIntegrationConnectors,
  CRM_INTEGRATION_CONNECTORS,
} from "./enterprise/integration-architecture.ts";
export {
  buildExecutiveCrmBundle,
  crmEnterpriseDrillDown,
  type ExecutiveCrmBundle,
} from "./enterprise/orchestrator.ts";
export {
  buildCrmEnterpriseSnapshotFromSources,
  emptyCrmEnterpriseSnapshot,
} from "./enterprise/snapshot-builder.ts";
export {
  buildUnifiedCrm360Timeline,
  type Crm360TimelineItem,
  type Crm360TimelineKind,
} from "./enterprise/timeline-360.ts";
export {
  sanitizeCrmFilter,
  assertCrmTenantMatch,
  validateOportunidadeTransition,
  ensureSinglePrincipalContatos,
} from "./enterprise/filter-engine.ts";
