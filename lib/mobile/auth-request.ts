import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type MobileAuthContext = {
  user: User;
  supabase: SupabaseClient<Database>;
  token: string;
};

export type MobileAuthFailure = {
  ok: false;
  status: 401;
  message: string;
};

export type MobileAuthSuccess = MobileAuthContext & { ok: true };

export type MobileAuthResult = MobileAuthSuccess | MobileAuthFailure;

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Valida Bearer access token via Supabase anon + getUser().
 * Nunca usa service role em rotas mobile.
 */
export async function authenticateMobileRequest(
  request: Request,
): Promise<MobileAuthResult> {
  const token = bearerToken(request);
  if (!token) {
    return { ok: false, status: 401, message: "Token ausente" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, status: 401, message: "Serviço indisponível" };
  }

  const supabase = createClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, message: "Sessão inválida ou expirada" };
  }

  return { ok: true, user, supabase, token };
}

export function isMobileAuthFailure(
  result: MobileAuthResult,
): result is MobileAuthFailure {
  return "ok" in result && result.ok === false;
}
