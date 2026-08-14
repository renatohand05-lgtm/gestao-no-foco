"use server";

import { createClient } from "@/lib/supabase/server";
import { getPostLoginPath } from "@/lib/auth/redirect";
import { logger } from "@/lib/observability/logger";

/**
 * Usar apenas em contextos server-side onde a sessão já está nos cookies
 * (ex.: callback OAuth). Para login com signInWithPassword no cliente,
 * use getPostLoginPath com o browser client diretamente.
 */
export async function getAuthRedirectPath(redirectTo?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.exception("auth.getAuthRedirectPath", error, { domain: "auth" });
    throw new Error("Não foi possível validar a sessão. Faça login novamente.");
  }

  if (!user) {
    return "/login";
  }

  return getPostLoginPath(supabase, user.id, redirectTo);
}
