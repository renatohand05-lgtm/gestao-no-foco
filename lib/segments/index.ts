export {
  PRODUCT_CAPABILITIES,
  isProductCapability,
  type ProductCapability,
} from "./capabilities.ts";
export {
  SEGMENT_ENGINE_VERSION,
  PRODUCT_SEGMENT_IDS,
  isProductSegmentId,
  parseSegmentConfig,
  type ProductSegmentId,
  type SegmentProfile,
  type TenantSegmentConfig,
  type ResolvedSegmentContext,
  type SegmentTerminology,
} from "./types.ts";
export { SEGMENT_PROFILES, getSegmentProfile } from "./profiles.ts";
export {
  mapStoredSegmentToProduct,
  usesCapabilityEngine,
  hasCapability,
  resolveSegmentContext,
  applyOverrides,
  type ResolveSegmentInput,
} from "./resolve.ts";
export {
  filterNavByCapabilities,
  NAV_ITEM_CAPABILITY,
  isNavItemRelevant,
} from "./nav.ts";
export {
  getFinancePresetsForSegment,
  financePresetsReuseCatalog,
  uniqueFinancePresetIds,
  orderDespesaPresetsForSegment,
} from "./finance-presets.ts";
export {
  CAPABILITY_DEFS,
  CAPABILITY_ALIASES,
  canonicalizeCapability,
  FUTURE_CAPABILITIES,
  ESSENTIAL_NAV_IDS,
  type CapabilityDef,
} from "./capabilities.ts";
export {
  setCapabilityOverride,
  resetSegmentConfig,
  hasTenantOverrides,
  configAfterSegmentChange,
  canEnableCapability,
} from "./overrides.ts";
export { listSegmentModuleRows, type SegmentModuleRow } from "./matrix.ts";
export { resolveMobileModuleFlags, isOpsActionRelevant } from "./mobile-tabs.ts";
export {
  segmentDashboardFlags,
  filterDashboardSurface,
  isDashboardSurfaceRelevant,
} from "./dashboard.ts";
export { getSegmentGaps, listAllSegmentGaps } from "./gaps.ts";
