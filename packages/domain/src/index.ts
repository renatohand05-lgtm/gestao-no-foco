/**
 * @gof/domain — contratos multiplataforma (sem React/Next).
 */

export type AuthSessionState =
  | "booting"
  | "unauthenticated"
  | "authenticating"
  | "authenticated_without_tenant"
  | "authenticated_without_branch"
  | "authenticated"
  | "refreshing"
  | "expired"
  | "revoked"
  | "offline_limited"
  | "error";

/** Códigos estáveis para erros de autenticação mobile (31.1). */
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "session_expired"
  | "session_revoked"
  | "network_unavailable"
  | "biometric_failed"
  | "biometric_not_enrolled"
  | "biometric_cancelled"
  | "password_reset_failed"
  | "password_update_failed"
  | "tenant_membership_missing"
  | "refresh_failed"
  | "unknown";

export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  branchId: string | null;
  branchName: string | null;
  segmentId: string | null;
  permissions: readonly string[];
};

export type SessionSnapshot = {
  state: AuthSessionState;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  hasSecureToken: boolean;
  /** Nunca inclui o token. */
  expiresAt: string | null;
};

export type NetworkStatus = "online" | "offline" | "unknown";

export type SyncStatus =
  | "idle"
  | "syncing"
  | "error"
  | "stale"
  | "offline_readonly";

export type OfflineFoundation = {
  network: NetworkStatus;
  sync: SyncStatus;
  readOnlyOffline: true;
  mutationsAllowedOffline: false;
  financialMutationsOffline: false;
};

export type PushFoundation = {
  permissionRequested: false;
  tokenRegistered: false;
  providerConfigured: false;
};

export type DeviceCapabilityAdapters = {
  camera: "prepared";
  barcode: "prepared";
  files: "prepared";
  location: "prepared_not_requested";
  biometrics: "prepared";
  notifications: "prepared_not_requested";
};

export type FutureModuleCard = {
  id: "dashboard" | "crm" | "operations" | "inventory" | "finance" | "notifications";
  label: string;
  status: "planned";
};

export const FUTURE_MODULE_CARDS: readonly FutureModuleCard[] = [
  { id: "dashboard", label: "Dashboard", status: "planned" },
  { id: "crm", label: "CRM", status: "planned" },
  { id: "operations", label: "Operações / OS", status: "planned" },
  { id: "inventory", label: "Estoque", status: "planned" },
  { id: "finance", label: "Financeiro", status: "planned" },
  { id: "notifications", label: "Notificações", status: "planned" },
];

export type QueryKeyParts = {
  tenantId: string | null;
  branchId: string | null;
  module: string;
  entity?: string;
  filters?: Record<string, string | number | boolean | null>;
  version?: string;
};

export function buildQueryKey(parts: QueryKeyParts): readonly unknown[] {
  return [
    "gof",
    parts.version ?? "v1",
    parts.tenantId ?? "no-tenant",
    parts.branchId ?? "no-branch",
    parts.module,
    parts.entity ?? "root",
    parts.filters ?? {},
  ] as const;
}
