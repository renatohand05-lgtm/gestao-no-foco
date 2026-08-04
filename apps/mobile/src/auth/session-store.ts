import type { AuthSessionState, SessionSnapshot } from "@gof/domain";
import { create } from "zustand";

import { authErrorFromCode, normalizeAuthError } from "@/auth/errors";
import { evaluateOfflineGate } from "@/auth/offline-gate";
import { refreshSessionOnce } from "@/auth/refresh";
import {
  clearSecureSession,
  getAccessToken,
  isMockToken,
  isProductionMode,
  loadSessionMetadata,
  loadStoredSession,
  saveSession,
  setLastBranchId,
  setLastTenantId,
  touchLastValidatedAt,
} from "@/auth/secure-session";
import { postLogout } from "@/api/mobile-api";
import { isSupabaseConfigured } from "@/env/validate";
import { logger } from "@/observability/logger";
import { fetchNetworkStatus } from "@/offline/network";
import { getSupabaseClient, resetSupabaseClient, sessionToStored } from "@/supabase/client";
import { useTenantStore } from "@/tenant/context-store";
import { queryClient } from "@/query/client";

type SessionStore = {
  state: AuthSessionState;
  snapshot: SessionSnapshot;
  errorMessage: string | null;
  boot: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  markTenantSelected: () => void;
  markBranchSelected: () => void;
  markContinueWithoutBranch: () => void;
  setOfflineLimited: () => void;
  setRevoked: () => void;
  setError: (message: string) => void;
  syncFromSession: (partial?: Partial<SessionSnapshot>) => void;
};

const initialSnapshot: SessionSnapshot = {
  state: "booting",
  userId: null,
  email: null,
  displayName: null,
  hasSecureToken: false,
  expiresAt: null,
};

function snapshotFrom(
  state: AuthSessionState,
  partial: Partial<SessionSnapshot> = {},
): SessionSnapshot {
  return { ...initialSnapshot, state, ...partial };
}

function resolveContextState(): AuthSessionState {
  const tenant = useTenantStore.getState();
  if (!tenant.tenantId) return "authenticated_without_tenant";
  if (!tenant.branchId && !tenant.continuedWithoutBranch) {
    return "authenticated_without_branch";
  }
  return "authenticated";
}

async function persistSupabaseSession(): Promise<SessionSnapshot | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;

  const stored = sessionToStored(data.session);
  if (isProductionMode() && isMockToken(stored.accessToken)) {
    await clearSecureSession();
    await supabase.auth.signOut();
    return null;
  }

  await saveSession(stored);
  return snapshotFrom(resolveContextState(), {
    userId: stored.userId,
    email: stored.email,
    displayName: stored.displayName,
    hasSecureToken: true,
    expiresAt: stored.expiresAt,
  });
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  state: "booting",
  snapshot: initialSnapshot,
  errorMessage: null,

  syncFromSession: (partial = {}) => {
    const nextState = resolveContextState();
    set({
      state: nextState,
      snapshot: snapshotFrom(nextState, {
        ...get().snapshot,
        ...partial,
      }),
    });
  },

  boot: async () => {
    set({ state: "booting", snapshot: snapshotFrom("booting"), errorMessage: null });

    try {
      const network = await fetchNetworkStatus();
      const stored = await loadStoredSession();

      if (!stored) {
        set({ state: "unauthenticated", snapshot: snapshotFrom("unauthenticated") });
        return;
      }

      if (isProductionMode() && isMockToken(stored.accessToken)) {
        await clearSecureSession();
        set({ state: "unauthenticated", snapshot: snapshotFrom("unauthenticated") });
        return;
      }

      if (network === "offline") {
        const gate = await evaluateOfflineGate();
        if (gate.allowed) {
          const meta = await loadSessionMetadata();
          if (meta.lastTenantId) {
            useTenantStore.getState().restoreFromMetadata({
              tenantId: meta.lastTenantId,
              branchId: meta.lastBranchId,
            });
          }
          set({
            state: "offline_limited",
            snapshot: snapshotFrom("offline_limited", {
              userId: gate.session.userId,
              email: gate.session.email,
              displayName: gate.session.displayName,
              hasSecureToken: true,
              expiresAt: gate.session.expiresAt,
            }),
          });
          return;
        }
        set({
          state: "expired",
          errorMessage: authErrorFromCode("session_expired").message,
          snapshot: snapshotFrom("expired"),
        });
        return;
      }

      if (!isSupabaseConfigured()) {
        set({
          state: "error",
          errorMessage: "Supabase não configurado",
          snapshot: snapshotFrom("error"),
        });
        return;
      }

      set({ state: "refreshing", snapshot: snapshotFrom("refreshing", get().snapshot) });

      const refreshed = await refreshSessionOnce();
      const snapshot = refreshed ? await persistSupabaseSession() : await persistSupabaseSession();

      if (!snapshot) {
        await clearSecureSession();
        useTenantStore.getState().clearTenant();
        set({
          state: "revoked",
          errorMessage: authErrorFromCode("session_revoked").message,
          snapshot: snapshotFrom("revoked"),
        });
        return;
      }

      const meta = await loadSessionMetadata();
      if (meta.lastTenantId) {
        useTenantStore.getState().restoreFromMetadata({
          tenantId: meta.lastTenantId,
          branchId: meta.lastBranchId,
        });
      }

      await touchLastValidatedAt();
      const nextState = resolveContextState();
      set({
        state: nextState,
        snapshot: snapshotFrom(nextState, snapshot),
      });
    } catch (err) {
      logger.error("session.boot_failed", err);
      set({
        state: "error",
        errorMessage: normalizeAuthError(err).message,
        snapshot: snapshotFrom("error"),
      });
    }
  },

  login: async (email, password) => {
    if (!email.trim() || !password.trim()) return false;

    set({
      state: "authenticating",
      snapshot: snapshotFrom("authenticating"),
      errorMessage: null,
    });

    try {
      if (!isSupabaseConfigured()) {
        set({
          state: "error",
          errorMessage: "Supabase não configurado",
          snapshot: snapshotFrom("error"),
        });
        return false;
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.session) {
        const normalized = normalizeAuthError(error);
        set({
          state: "unauthenticated",
          errorMessage: normalized.message,
          snapshot: snapshotFrom("unauthenticated"),
        });
        return false;
      }

      const stored = sessionToStored(data.session, email.trim());
      await saveSession(stored);
      useTenantStore.getState().clearTenant();

      set({
        state: "authenticated_without_tenant",
        snapshot: snapshotFrom("authenticated_without_tenant", {
          userId: stored.userId,
          email: stored.email,
          displayName: stored.displayName,
          hasSecureToken: true,
          expiresAt: stored.expiresAt,
        }),
      });
      return true;
    } catch (err) {
      logger.error("session.login_failed", err);
      const normalized = normalizeAuthError(err);
      set({
        state: "error",
        errorMessage: normalized.message,
        snapshot: snapshotFrom("error"),
      });
      return false;
    }
  },

  logout: async () => {
    const userId = get().snapshot.userId;
    const tenant = useTenantStore.getState();
    try {
      if (isSupabaseConfigured()) {
        await getSupabaseClient().auth.signOut();
      }
      await postLogout().catch(() => undefined);
    } catch (err) {
      logger.warn("session.logout_remote_failed", err);
    } finally {
      if (userId && tenant.tenantId) {
        try {
          const { clearProductivityCaches } = await import(
            "@/productivity/storage"
          );
          await clearProductivityCaches(userId, tenant.tenantId, tenant.branchId);
        } catch {
          /* ignore */
        }
      }
      await clearSecureSession();
      resetSupabaseClient();
      useTenantStore.getState().clearTenant();
      queryClient.clear();
      set({
        state: "unauthenticated",
        snapshot: snapshotFrom("unauthenticated"),
        errorMessage: null,
      });
    }
  },

  markTenantSelected: () => {
    const { snapshot } = get();
    const tenant = useTenantStore.getState();
    void setLastTenantId(tenant.tenantId || null);
    set({
      state: "authenticated_without_branch",
      snapshot: snapshotFrom("authenticated_without_branch", {
        userId: snapshot.userId,
        email: snapshot.email,
        displayName: snapshot.displayName,
        hasSecureToken: true,
        expiresAt: snapshot.expiresAt,
      }),
    });
  },

  markBranchSelected: () => {
    const { snapshot } = get();
    const tenant = useTenantStore.getState();
    void setLastBranchId(tenant.branchId);
    set({
      state: "authenticated",
      snapshot: snapshotFrom("authenticated", {
        userId: snapshot.userId,
        email: snapshot.email,
        displayName: snapshot.displayName,
        hasSecureToken: true,
        expiresAt: snapshot.expiresAt,
      }),
    });
  },

  markContinueWithoutBranch: () => {
    const { snapshot } = get();
    void setLastBranchId(null);
    set({
      state: "authenticated",
      snapshot: snapshotFrom("authenticated", {
        userId: snapshot.userId,
        email: snapshot.email,
        displayName: snapshot.displayName,
        hasSecureToken: true,
        expiresAt: snapshot.expiresAt,
      }),
    });
  },

  setOfflineLimited: () => {
    const { snapshot } = get();
    set({
      state: "offline_limited",
      snapshot: snapshotFrom("offline_limited", {
        userId: snapshot.userId,
        email: snapshot.email,
        displayName: snapshot.displayName,
        hasSecureToken: Boolean(snapshot.hasSecureToken),
        expiresAt: snapshot.expiresAt,
      }),
    });
  },

  setRevoked: () => {
    set({
      state: "revoked",
      errorMessage: authErrorFromCode("session_revoked").message,
      snapshot: snapshotFrom("revoked"),
    });
  },

  setError: (message) => {
    set({
      state: "error",
      errorMessage: message,
      snapshot: snapshotFrom("error"),
    });
  },
}));

export async function getSessionTokenForApi(): Promise<string | null> {
  return getAccessToken();
}
