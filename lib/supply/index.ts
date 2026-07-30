/**
 * Fase 25 — Supply Chain / Compras / Estoque Enterprise · API pública.
 *
 * Reutiliza:
 * - `lib/produtos` + `public.produtos`
 * - `lib/estoque` + `estoque_movimentacoes`
 * - `lib/financeiro/fornecedor-service` + `fornecedores`
 * - Finance Core, CRM, Analytics Core (pontes)
 */

export {
  isSupplyEnterpriseEnabled,
  isSupplyExternalAiEnabled,
  isSupplyExternalIntegrationsEnabled,
  getSupplyFeatureFlags,
} from "./supply-feature-flags.ts";

export type * from "./enterprise/types.ts";

export {
  SUPPLY_KPI_CATALOG,
  getSupplyKpiDefinition,
} from "./enterprise/kpi-catalog.ts";

export {
  resolveSupplyKpi,
  resolveSupplyCatalogKpis,
  buildSupplyDrillDown,
  buildSupplyKpiDrillDownFromSnapshot,
} from "./enterprise/kpi-engine.ts";

export {
  emptySupplyEnterpriseSnapshot,
  emptySupplyFilter,
  buildSupplyEnterpriseSnapshotFromSources,
} from "./enterprise/snapshot-builder.ts";

export {
  buildExecutiveSupplyBundle,
  supplyEnterpriseDrillDown,
  type ExecutiveSupplyBundle,
} from "./enterprise/orchestrator.ts";

export {
  buildSupplyAlerts,
  dedupeSupplyAlerts,
} from "./enterprise/alert-engine.ts";

export {
  sanitizeSupplyFilter,
  assertSupplyTenantMatch,
} from "./enterprise/filter-engine.ts";

export {
  deterministicSupplyProvider,
  externalSupplyStubProvider,
  mockSupplyProvider,
  resolveSupplyProvider,
} from "./enterprise/supply-ai-provider.ts";

export {
  describeSupplyIntegrationArchitecture,
  listSupplyIntegrationBridges,
  SUPPLY_INTEGRATION_BRIDGES,
} from "./enterprise/integration-bridges.ts";

export {
  ENTERPRISE_MOVEMENT_KINDS,
  LEGACY_MOVEMENT_TYPES,
  MOVEMENT_KIND_LABELS,
  movementBalanceDelta,
  toLegacyMovementType,
  isAuditableMovement,
  assertMovementKind,
} from "./enterprise/movement-taxonomy.ts";

export {
  PRODUCT_ENTERPRISE_TIPOS,
  PRODUCT_TIPO_LABELS,
  LEGACY_PRODUCT_TIPOS,
  normalizeProductTipo,
  productTracksStock,
  computeTargetMargin,
  isBelowMinPrice,
} from "./enterprise/product-catalog.ts";

export {
  formatLocationCode,
  parseLocationCode,
  assertDepositoDraft,
  assertAlmoxarifadoDraft,
} from "./enterprise/warehouse-model.ts";

export {
  PURCHASE_WORKFLOW_STATUSES,
  PURCHASE_STATUS_LABELS,
  DEFAULT_PURCHASE_TRANSITIONS,
  canTransitionPurchase,
  assertPurchaseTransition,
  assertPurchaseStatus,
  purchaseTriggersStockIntegration,
  purchaseTriggersFinanceIntegration,
  validatePurchaseLines,
  sumPurchaseLines,
} from "./enterprise/purchase-workflow.ts";

export {
  computeInventoryDivergences,
  inventoryNeedsAdjustment,
  canTransitionInventory,
  assertInventoryTransition,
  INVENTORY_STATUS_TRANSITIONS,
} from "./enterprise/inventory-model.ts";

export {
  resolveAverageCost,
  AVERAGE_COST_METHODOLOGY,
} from "./enterprise/average-cost.ts";

/* Integração Finance/Estoque: importar de ./enterprise/purchase-integration.ts
 * (não no barrel — path aliases quebram strip-types nos testes Node). */

export {
  scoreSupplierPerformance,
  rankSuppliers,
} from "./enterprise/supplier-performance.ts";
