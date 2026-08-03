export type {
  NetworkStatus,
  OfflineFoundation,
  SyncStatus,
} from "@gof/domain";

export { type PushFoundation } from "@gof/domain";

export const OFFLINE_FOUNDATION = {
  network: "unknown" as const,
  sync: "idle" as const,
  readOnlyOffline: true,
  mutationsAllowedOffline: false,
  financialMutationsOffline: false,
} satisfies import("@gof/domain").OfflineFoundation;
