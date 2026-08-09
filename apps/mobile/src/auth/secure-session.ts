import { logger } from "@/observability/logger";
import {
  safeSecureDelete,
  safeSecureGet,
  safeSecureSet,
} from "@/storage/secure";

export const STORAGE_VERSION = 2;

/** Chaves reais do SecureStore para sessão mobile (não inventar nomes). */
export const SECURE_SESSION_KEYS = {
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

const KEYS = SECURE_SESSION_KEYS;

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

  logger.info("session.mock_saved", { userId });
  return {
    accessToken,
    refreshToken,
    userId,
    email: input.email,
    displayName,
    expiresAt: null,
  };
}

export async function saveSession(input: StoredSession): Promise<void> {
  await safeSecureSet(KEYS.storageVersion, String(STORAGE_VERSION));
  await safeSecureSet(KEYS.accessToken, input.accessToken);
  if (input.refreshToken) {
    await safeSecureSet(KEYS.refreshToken, input.refreshToken);
  } else {
    await safeSecureDelete(KEYS.refreshToken);
  }
  await safeSecureSet(KEYS.userId, input.userId);
  await safeSecureSet(KEYS.email, input.email);
  await safeSecureSet(KEYS.displayName, input.displayName);
  if (input.expiresAt) {
    await safeSecureSet(KEYS.expiresAt, input.expiresAt);
  } else {
    await safeSecureDelete(KEYS.expiresAt);
  }
  await touchLastValidatedAt();
  logger.info("session.saved", { userId: input.userId });
}

export async function touchLastValidatedAt(): Promise<void> {
  await safeSecureSet(KEYS.lastValidatedAt, new Date().toISOString());
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  const accessToken = await safeSecureGet(KEYS.accessToken);
  if (!accessToken) return null;

  if (isProductionMode() && isMockToken(accessToken)) {
    await clearSecureSession();
    return null;
  }

  const [refreshToken, userId, email, displayName, expiresAt] =
    await Promise.all([
      safeSecureGet(KEYS.refreshToken),
      safeSecureGet(KEYS.userId),
      safeSecureGet(KEYS.email),
      safeSecureGet(KEYS.displayName),
      safeSecureGet(KEYS.expiresAt),
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

/**
 * Bearer para `/api/mobile/v1/*`.
 * Prefer SecureStore; se vazio (Keychain após upgrade Ad Hoc→App Store,
 * ou token > limite ~2048), usa a sessão Auth canônica no AsyncStorage.
 */
export async function getAccessToken(): Promise<string | null> {
  const token = await safeSecureGet(KEYS.accessToken);
  if (token) {
    if (isProductionMode() && isMockToken(token)) {
      return null;
    }
    return token;
  }

  try {
    const { isSupabaseConfigured } = await import("@/env/validate");
    if (!isSupabaseConfigured()) return null;
    const { getSupabaseClient } = await import("@/supabase/client");
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const access = data.session?.access_token ?? null;
    if (!access) return null;
    if (isProductionMode() && isMockToken(access)) return null;
    // Best-effort: reidratar SecureStore para próximas leituras / offline gate
    void safeSecureSet(KEYS.accessToken, access);
    logger.info("session.token_fallback_supabase");
    return access;
  } catch (err) {
    logger.warn("session.token_fallback_failed", {
      name: err instanceof Error ? err.name : "Error",
    });
    return null;
  }
}

export async function loadSessionMetadata(): Promise<SessionMetadata> {
  const [biometricRaw, lastTenantId, lastBranchId, lastValidatedAt] =
    await Promise.all([
      safeSecureGet(KEYS.biometricEnabled),
      safeSecureGet(KEYS.lastTenantId),
      safeSecureGet(KEYS.lastBranchId),
      safeSecureGet(KEYS.lastValidatedAt),
    ]);

  return {
    biometricEnabled: biometricRaw === "true",
    lastTenantId,
    lastBranchId,
    lastValidatedAt,
  };
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await safeSecureSet(KEYS.biometricEnabled, enabled ? "true" : "false");
}

export async function setLastTenantId(tenantId: string | null): Promise<void> {
  if (tenantId) {
    await safeSecureSet(KEYS.lastTenantId, tenantId);
  } else {
    await safeSecureDelete(KEYS.lastTenantId);
  }
}

export async function setLastBranchId(branchId: string | null): Promise<void> {
  if (branchId) {
    await safeSecureSet(KEYS.lastBranchId, branchId);
  } else {
    await safeSecureDelete(KEYS.lastBranchId);
  }
}

export async function clearSecureSession(): Promise<void> {
  await Promise.all(
    Object.values(KEYS).map((key) => safeSecureDelete(key)),
  );
  logger.info("session.cleared");
}
