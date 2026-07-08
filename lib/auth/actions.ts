"use server";

import { createClient } from "@/lib/supabase/server";
import { getPostLoginPath } from "@/lib/auth/redirect";

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
    console.error(error);
    throw new Error(error.message);
  }

  if (!user) {
    return "/login";
  }

  return getPostLoginPath(supabase, user.id, redirectTo);
}
