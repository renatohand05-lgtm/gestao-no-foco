import { cancelPendingRefresh } from "@/auth/refresh";
import { clearSecureSession } from "@/auth/secure-session";
import { logger } from "@/observability/logger";
import { queryClient } from "@/query/client";
import {
  clearSupabaseAuthStorage,
  resetSupabaseClient,
} from "@/supabase/client";
import { useTenantStore } from "@/tenant/context-store";

export type ResetLocalAuthOptions = {
  /** Motivo sanitizado para log (sem tokens). */
  reason?: string;
  /** Mensagem amigável exibida na tela de login. */
  errorMessage?: string | null;
};

type SessionResetTarget = {
  setState: (partial: {
    state: "unauthenticated";
    snapshot: {
      state: "unauthenticated";
      userId: null;
      email: null;
      displayName: null;
      hasSecureToken: false;
      expiresAt: null;
    };
    errorMessage: string | null;
  }) => void;
};

let resetInFlight: Promise<void> | null = null;
let sessionResetTarget: SessionResetTarget | null = null;

/**
 * Registra o store de sessão para evitar import circular com session-store.
 * Chamado uma vez na inicialização do session-store.
 */
export function bindSessionResetTarget(target: SessionResetTarget): void {
  sessionResetTarget = target;
}

/**
 * Apaga somente artefatos locais de autenticação mobile.
 * Idempotente. Não altera conta remota, tenant no servidor nem service role.
 * Preserva caches de produtividade (não sensíveis à sessão).
 * Erros parciais não derrubam o app.
 */
export async function wipeLocalAuthArtifacts(): Promise<void> {
  try {
    cancelPendingRefresh();
  } catch {
    /* ignore */
  }

  try {
    await clearSecureSession();
  } catch (err) {
    logger.warn("auth.wipe_secure_failed", {
      name: err instanceof Error ? err.name : "Error",
    });
  }

  try {
    await clearSupabaseAuthStorage();
  } catch (err) {
    logger.warn("auth.wipe_supabase_storage_failed", {
      name: err instanceof Error ? err.name : "Error",
    });
  }

  try {
    resetSupabaseClient();
  } catch {
    /* ignore */
  }

  try {
    useTenantStore.getState().clearTenant();
  } catch {
    /* ignore */
  }

  try {
    queryClient.clear();
  } catch {
    /* ignore */
  }
}

/**
 * Recuperação segura: limpa auth local e força signed-out (unauthenticated).
 * Idempotente — chamadas concorrentes compartilham a mesma promise.
 */
export async function resetLocalMobileAuth(
  options: ResetLocalAuthOptions = {},
): Promise<void> {
  if (resetInFlight) return resetInFlight;

  resetInFlight = (async () => {
    try {
      await wipeLocalAuthArtifacts();
      try {
        sessionResetTarget?.setState({
          state: "unauthenticated",
          snapshot: {
            state: "unauthenticated",
            userId: null,
            email: null,
            displayName: null,
            hasSecureToken: false,
            expiresAt: null,
          },
          errorMessage: options.errorMessage ?? null,
        });
      } catch (err) {
        logger.warn("auth.reset_set_state_failed", {
          name: err instanceof Error ? err.name : "Error",
        });
      }
      logger.info("auth.local_reset", {
        reason: options.reason ?? "unspecified",
      });
    } catch (err) {
      logger.error("auth.local_reset_failed", err);
      try {
        sessionResetTarget?.setState({
          state: "unauthenticated",
          snapshot: {
            state: "unauthenticated",
            userId: null,
            email: null,
            displayName: null,
            hasSecureToken: false,
            expiresAt: null,
          },
          errorMessage:
            options.errorMessage ??
            "Não foi possível limpar a sessão local. Tente entrar novamente.",
        });
      } catch {
        /* ignore */
      }
    } finally {
      resetInFlight = null;
    }
  })();

  return resetInFlight;
}

export function isLocalAuthResetInFlight(): boolean {
  return resetInFlight !== null;
}
