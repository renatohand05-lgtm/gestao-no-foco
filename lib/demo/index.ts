export type {
  DemoPresentationMode,
  DemoHideFlags,
  DemoModeState,
} from "@/lib/demo/demo-types";

export {
  DEMO_STORAGE_KEY,
  DEMO_QUERY_KEY,
  DEMO_MODE_LABELS,
  DEMO_MODE_HINTS,
  hideFlagsForMode,
  isDemoDataTenantSlug,
} from "@/lib/demo/demo-constants";

export {
  parseDemoMode,
  readDemoModeFromStorage,
  writeDemoModeToStorage,
  readDemoModeFromSearch,
  getDemoPresentationTrail,
} from "@/lib/demo/demo-presentation";
