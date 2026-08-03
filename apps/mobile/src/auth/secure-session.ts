import * as SecureStore from "expo-secure-store";

import { logger } from "@/observability/logger";

export const STORAGE_VERSION = 2;

const KEYS = {
  storageVersion: "gof.storage_version",
  accessToken: "gof.access_token",
  refreshToken: "gof.refresh_token",
  userId: "gof.user_id",
  email: "gof.email",
  displayName: "gof.display_name",
  expiresAt: "gof.expires_at",
  biometricEnabled: "gof.biometric_enabled",
  lastTenantId: "gof.last_tenant_id",
  lastBranchId: "gof.last_branch_id",
  lastValidatedAt: "gof.last_validated_at",
} as const;

export type StoredSession = {
  accessToken: string;
  refreshToken: string | null;
  userId: string;
  email: string;
  displayName: string;
  expiresAt: string | null;
};

export type SessionMetadata = {
  biometricEnabled: boolean;
  lastTenantId: string | null;
  lastBranchId: string | null;
  lastValidatedAt: string | null;
};

export function isMockToken(token: string): boolean {
  return token.startsWith("mock.");
}

export function isProductionMode(): boolean {
  return process.env.EXPO_PUBLIC_APP_ENV === "production";
}

/** Mock only — testes; rejeitado em produção pelo session-store. */
export async function saveMockSession(input: {
  email: string;
  displayName?: string;
}): Promise<StoredSession> {
  const ts = Date.now();
  const accessToken = `mock.access.${ts}`;
  const refreshToken = `mock.refresh.${ts}`;
  const userId = `mock_user_${ts}`;
  const displayName = input.displayName ?? input.email.split("@")[0] ?? "Usuário";

  await saveSession({
    accessToken,
    refreshToken,
    userId,
    email: input.email,
    displayName,
    expiresAt: null,
  });

  logger.info("session.mock_saved", { userId, email: input.email });
  return { accessToken, refreshToken, userId, email: input.email, displayName, expiresAt: null };
}

export async function saveSession(input: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(KEYS.storageVersion, String(STORAGE_VERSION));
  await SecureStore.setItemAsync(KEYS.accessToken, input.accessToken);
  if (input.refreshToken) {
    await SecureStore.setItemAsync(KEYS.refreshToken, input.refreshToken);
  } else {
    await SecureStore.deleteItemAsync(KEYS.refreshToken).catch(() => undefined);
  }
  await SecureStore.setItemAsync(KEYS.userId, input.userId);
  await SecureStore.setItemAsync(KEYS.email, input.email);
  await SecureStore.setItemAsync(KEYS.displayName, input.displayName);
  if (input.expiresAt) {
    await SecureStore.setItemAsync(KEYS.expiresAt, input.expiresAt);
  } else {
    await SecureStore.deleteItemAsync(KEYS.expiresAt).catch(() => undefined);
  }
  await touchLastValidatedAt();
  logger.info("session.saved", { userId: input.userId });
}

export async function touchLastValidatedAt(): Promise<void> {
  await SecureStore.setItemAsync(KEYS.lastValidatedAt, new Date().toISOString());
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  const accessToken = await SecureStore.getItemAsync(KEYS.accessToken);
  if (!accessToken) return null;

  if (isProductionMode() && isMockToken(accessToken)) {
    await clearSecureSession();
    return null;
  }

  const [refreshToken, userId, email, displayName, expiresAt] = await Promise.all([
    SecureStore.getItemAsync(KEYS.refreshToken),
    SecureStore.getItemAsync(KEYS.userId),
    SecureStore.getItemAsync(KEYS.email),
    SecureStore.getItemAsync(KEYS.displayName),
    SecureStore.getItemAsync(KEYS.expiresAt),
  ]);

  if (!userId || !email) return null;

  return {
    accessToken,
    refreshToken,
    userId,
    email,
    displayName: displayName ?? email,
    expiresAt,
  };
}

export async function getAccessToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(KEYS.accessToken);
  if (token && isProductionMode() && isMockToken(token)) {
    return null;
  }
  return token;
}

export async function loadSessionMetadata(): Promise<SessionMetadata> {
  const [biometricRaw, lastTenantId, lastBranchId, lastValidatedAt] =
    await Promise.all([
      SecureStore.getItemAsync(KEYS.biometricEnabled),
      SecureStore.getItemAsync(KEYS.lastTenantId),
      SecureStore.getItemAsync(KEYS.lastBranchId),
      SecureStore.getItemAsync(KEYS.lastValidatedAt),
    ]);

  return {
    biometricEnabled: biometricRaw === "true",
    lastTenantId,
    lastBranchId,
    lastValidatedAt,
  };
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.biometricEnabled, enabled ? "true" : "false");
}

export async function setLastTenantId(tenantId: string | null): Promise<void> {
  if (tenantId) {
    await SecureStore.setItemAsync(KEYS.lastTenantId, tenantId);
  } else {
    await SecureStore.deleteItemAsync(KEYS.lastTenantId).catch(() => undefined);
  }
}

export async function setLastBranchId(branchId: string | null): Promise<void> {
  if (branchId) {
    await SecureStore.setItemAsync(KEYS.lastBranchId, branchId);
  } else {
    await SecureStore.deleteItemAsync(KEYS.lastBranchId).catch(() => undefined);
  }
}

export async function clearSecureSession(): Promise<void> {
  await Promise.all(
    Object.values(KEYS).map((key) =>
      SecureStore.deleteItemAsync(key).catch(() => undefined),
    ),
  );
  logger.info("session.cleared");
}
