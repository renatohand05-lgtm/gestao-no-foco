import type { AuthSessionState, SessionSnapshot } from "@gof/domain";
import { create } from "zustand";

import { resetBootAttemptCounters } from "@/auth/boot-attempts";
import { authErrorFromCode, normalizeAuthError } from "@/auth/errors";
import { evaluateOfflineGate } from "@/auth/offline-gate";
import {
  classifyRestoreFailure,
  messageForAuthFailure,
} from "@/auth/recovery-policy";
import { refreshSessionOnce } from "@/auth/refresh";
import {
  bindSessionResetTarget,
  resetLocalMobileAuth,
  wipeLocalAuthArtifacts,
} from "@/auth/reset-local-auth";
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
import { mobileTelemetry } from "@/observability/telemetry";
import { fetchNetworkStatus } from "@/offline/network";
import { getSupabaseClient, sessionToStored } from "@/supabase/client";
import { hydrateTenantPermissions } from "@/tenant/hydrate-permissions";
import { useTenantStore } from "@/tenant/context-store";

type BootOptions = {
  /** manual = reconectar explícito; auto = cold start (default). */
  mode?: "auto" | "manual";
};

type SessionStore = {
  state: AuthSessionState;
  snapshot: SessionSnapshot;
  errorMessage: string | null;
  boot: (options?: BootOptions) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  /** Recuperação segura → login (idempotente). */
  returnToLogin: (reason?: string, errorMessage?: string | null) => Promise<void>;
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

let bootInFlight: Promise<void> | null = null;
/** Uma restauração automática (refresh) por cold start; manual sempre permitido. */
let autoRestoreCompleted = false;

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

  boot: async (options = {}) => {
    const mode = options.mode ?? "auto";
    if (bootInFlight) return bootInFlight;

    if (mode === "auto" && autoRestoreCompleted) {
      // Evita segundo refresh automático (ex.: remount) sem impedir reconectar manual.
      return;
    }

    bootInFlight = (async () => {
      set({ state: "booting", snapshot: snapshotFrom("booting"), errorMessage: null });

      try {
        logger.info("session.boot_begin", {
          mode,
          networkKnown: true,
        });
        const network = await fetchNetworkStatus();
        logger.info("session.boot_network", { network });
        const stored = await loadStoredSession();
        logger.info("session.boot_stored", {
          hasSession: Boolean(stored),
          hasRefresh: Boolean(stored?.refreshToken),
        });

        if (!stored) {
          set({ state: "unauthenticated", snapshot: snapshotFrom("unauthenticated") });
          return;
        }

        if (isProductionMode() && isMockToken(stored.accessToken)) {
          await wipeLocalAuthArtifacts();
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
              await hydrateTenantPermissions({
                tenantId: meta.lastTenantId,
                online: false,
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
          await wipeLocalAuthArtifacts();
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
        const snapshot = await persistSupabaseSession();

        if (!snapshot) {
          const kind = classifyRestoreFailure({
            network: network === "online" ? "online" : "unknown",
            refreshOk: refreshed,
            hasSessionAfterRefresh: false,
          });
          mobileTelemetry.track("SESSION_REFRESH_FAILED", { reason: kind });
          await wipeLocalAuthArtifacts();
          set({
            state: "revoked",
            errorMessage: messageForAuthFailure(kind),
            snapshot: snapshotFrom("revoked"),
          });
          return;
        }

        mobileTelemetry.track("SESSION_RESTORED", {
          hasTenant: Boolean(useTenantStore.getState().tenantId),
        });

        const meta = await loadSessionMetadata();
        if (meta.lastTenantId) {
          useTenantStore.getState().restoreFromMetadata({
            tenantId: meta.lastTenantId,
            branchId: meta.lastBranchId,
          });
          // Cold start / upgrade: reidrata RBAC — sem isso Início/Dashboard some do tab bar.
          await hydrateTenantPermissions({
            tenantId: meta.lastTenantId,
            online: true,
          });
        }

        await touchLastValidatedAt();
        const nextState = resolveContextState();
        set({
          state: nextState,
          snapshot: snapshotFrom(nextState, snapshot),
          errorMessage: null,
        });
      } catch (err) {
        logger.error("session.boot_failed", err);
        const normalized = normalizeAuthError(err);
        // Rede: mantém artifacts para retry / "Voltar ao login".
        // Demais: limpa e signed-out (não classificar token como rede).
        if (normalized.code === "network_unavailable") {
          set({
            state: "error",
            errorMessage: normalized.message,
            snapshot: snapshotFrom("error"),
          });
          return;
        }
        await wipeLocalAuthArtifacts();
        set({
          state: "unauthenticated",
          errorMessage: normalized.message,
          snapshot: snapshotFrom("unauthenticated"),
        });
      } finally {
        if (mode === "auto") {
          autoRestoreCompleted = true;
        }
      }
    })().finally(() => {
      bootInFlight = null;
    });

    return bootInFlight;
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
        mobileTelemetry.track("LOGIN_FAILED", { code: normalized.code });
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
      resetBootAttemptCounters();
      autoRestoreCompleted = false;

      logger.info("postlogin.login_ok", {
        hasUser: Boolean(stored.userId),
        hasRefresh: Boolean(stored.refreshToken),
      });
      mobileTelemetry.track("LOGIN_SUCCESS");

      set({
        state: "authenticated_without_tenant",
        snapshot: snapshotFrom("authenticated_without_tenant", {
          userId: stored.userId,
          email: stored.email,
          displayName: stored.displayName,
          hasSecureToken: true,
          expiresAt: stored.expiresAt,
        }),
        errorMessage: null,
      });
      return true;
    } catch (err) {
      logger.error("session.login_failed", err);
      const normalized = normalizeAuthError(err);
      mobileTelemetry.track("LOGIN_FAILED", { code: normalized.code });
      set({
        state: "unauthenticated",
        errorMessage: normalized.message,
        snapshot: snapshotFrom("unauthenticated"),
      });
      return false;
    }
  },

  returnToLogin: async (reason = "return_to_login", errorMessage = null) => {
    resetBootAttemptCounters();
    autoRestoreCompleted = false;
    await resetLocalMobileAuth({ reason, errorMessage });
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
      resetBootAttemptCounters();
      autoRestoreCompleted = false;
      await resetLocalMobileAuth({ reason: "logout" });
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

bindSessionResetTarget({
  setState: (partial) => {
    useSessionStore.setState(partial);
  },
});

export async function getSessionTokenForApi(): Promise<string | null> {
  return getAccessToken();
}
