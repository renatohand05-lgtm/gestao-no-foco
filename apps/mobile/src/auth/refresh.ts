import { getSupabaseClient } from "@/supabase/client";
import { logger } from "@/observability/logger";

let refreshPromise: Promise<boolean> | null = null;
let refreshGeneration = 0;

/**
 * Cancela o interesse no refresh em voo (single-flight).
 * A promise em andamento conclui, mas novos callers não a reutilizam.
 */
export function cancelPendingRefresh(): void {
  refreshGeneration += 1;
  refreshPromise = null;
}

/**
 * Single-flight refresh de sessão Supabase.
 */
export async function refreshSessionOnce(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  const generation = refreshGeneration;

  refreshPromise = (async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.refreshSession();
      if (generation !== refreshGeneration) {
        return false;
      }
      if (error || !data.session) {
        logger.warn("session.refresh_failed", { message: error?.message });
        return false;
      }
      return true;
    } catch (err) {
      logger.error("session.refresh_error", err);
      return false;
    } finally {
      if (generation === refreshGeneration) {
        refreshPromise = null;
      }
    }
  })();

  return refreshPromise;
}

export function isRefreshInFlight(): boolean {
  return refreshPromise !== null;
}
