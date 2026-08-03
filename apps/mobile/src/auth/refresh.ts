import { getSupabaseClient } from "@/supabase/client";
import { logger } from "@/observability/logger";

let refreshPromise: Promise<boolean> | null = null;

/**
 * Single-flight refresh de sessão Supabase.
 */
export async function refreshSessionOnce(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        logger.warn("session.refresh_failed", { message: error?.message });
        return false;
      }
      return true;
    } catch (err) {
      logger.error("session.refresh_error", err);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function isRefreshInFlight(): boolean {
  return refreshPromise !== null;
}
