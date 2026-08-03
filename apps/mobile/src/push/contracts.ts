export type { PushFoundation, DeviceCapabilityAdapters } from "@gof/domain";

/** Prepared — no permission request at runtime in 31.0 */
export const PUSH_FOUNDATION = {
  permissionRequested: false,
  tokenRegistered: false,
  providerConfigured: false,
} satisfies import("@gof/domain").PushFoundation;

export const DEVICE_CAPABILITIES = {
  camera: "prepared",
  barcode: "prepared",
  files: "prepared",
  location: "prepared_not_requested",
  biometrics: "prepared",
  notifications: "prepared_not_requested",
} satisfies import("@gof/domain").DeviceCapabilityAdapters;
