/** Tipos seguros para Client Components (sem next/headers). */
export type {
  BootstrapLayoutResult,
  DashboardLayoutRecord,
  DashboardLayoutSummary,
  LayoutDensityProfile,
  PersistedLayoutData,
  SaveDashboardLayoutInput,
} from "@/lib/dashboard-layout/persistence/types";

export { LAYOUT_DATA_MAX_BYTES } from "@/lib/dashboard-layout/persistence/types";

export {
  LayoutValidationError,
  validateAndNormalizeLayoutData,
  validateDensityProfile,
  validateLayoutName,
} from "@/lib/dashboard-layout/persistence/layout-validation";

export { migrateLayoutData, bumpRecordVersion } from "@/lib/dashboard-layout/persistence/layout-versioning";

export {
  buildPersistedPayload,
  mapLayoutRow,
  toLayoutSummary,
} from "@/lib/dashboard-layout/persistence/layout-mappers";

/** Service/repository — somente Server Components / Actions */
export { DashboardLayoutRepository } from "@/lib/dashboard-layout/persistence/layout-repository";
export {
  DashboardLayoutService,
  createDashboardLayoutService,
  bootstrapDashboardLayoutSafe,
} from "@/lib/dashboard-layout/persistence/layout-service";
