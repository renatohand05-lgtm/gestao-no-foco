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
} from "./finance-presets.ts";
