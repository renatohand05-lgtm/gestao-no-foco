import {
  loadSessionMetadata,
  loadStoredSession,
  type StoredSession,
} from "@/auth/secure-session";

/** TTL offline limitado — 24 horas desde última validação online. */
export const OFFLINE_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export type OfflineGateResult =
  | { allowed: true; session: StoredSession }
  | { allowed: false; reason: "no_session" | "expired_ttl" | "no_tenant" };

export async function evaluateOfflineGate(): Promise<OfflineGateResult> {
  const session = await loadStoredSession();
  if (!session) {
    return { allowed: false, reason: "no_session" };
  }

  const meta = await loadSessionMetadata();
  if (!meta.lastTenantId) {
    return { allowed: false, reason: "no_tenant" };
  }

  if (!meta.lastValidatedAt) {
    return { allowed: false, reason: "expired_ttl" };
  }

  const validatedAt = new Date(meta.lastValidatedAt).getTime();
  if (Number.isNaN(validatedAt) || Date.now() - validatedAt > OFFLINE_SESSION_TTL_MS) {
    return { allowed: false, reason: "expired_ttl" };
  }

  return { allowed: true, session };
}

export function isWithinOfflineTtl(lastValidatedAt: string | null): boolean {
  if (!lastValidatedAt) return false;
  const validatedAt = new Date(lastValidatedAt).getTime();
  return !Number.isNaN(validatedAt) && Date.now() - validatedAt <= OFFLINE_SESSION_TTL_MS;
}
