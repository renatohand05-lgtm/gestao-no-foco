import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAnonKey, getSupabaseUrl, normalizePublicUrl } from "@/env/validate";
import { logger } from "@/observability/logger";
import { safeSecureDelete } from "@/storage/secure";

/**
 * Chave da sessão Auth Supabase.
 * Persistida em AsyncStorage (sessão JSON costuma passar do limite ~2048 bytes do SecureStore/iOS).
 * Tokens curtos da app continuam em SecureStore via secure-session.
 */
export const SUPABASE_AUTH_STORAGE_KEY = "gof.supabase.auth";

const ExpoAuthStorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (err) {
      logger.warn("supabase.storage_get_failed", {
        name: err instanceof Error ? err.name : "Error",
      });
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      logger.warn("supabase.storage_set_failed", {
        length: value.length,
        name: err instanceof Error ? err.name : "Error",
      });
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const rawUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!rawUrl || !anonKey) {
    throw new Error("Supabase não configurado (EXPO_PUBLIC_SUPABASE_URL / ANON_KEY)");
  }

  const url = normalizePublicUrl(rawUrl);

  logger.info("supabase.client_create", {
    urlHost: (() => {
      try {
        return new URL(url).host;
      } catch {
        return "invalid";
      }
    })(),
    hasAnonKey: Boolean(anonKey),
  });

  client = createClient(url, anonKey, {
    auth: {
      storage: ExpoAuthStorageAdapter,
      storageKey: SUPABASE_AUTH_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}

export function sessionToStored(session: Session, fallbackEmail?: string) {
  const user = session.user;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    userId: user.id,
    email: user.email ?? fallbackEmail ?? "",
    displayName:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Usuário",
    expiresAt: session.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : null,
  };
}

export function resetSupabaseClient(): void {
  client = null;
}

/** Limpa sessão Auth em AsyncStorage e resíduo legado no SecureStore. */
export async function clearSupabaseAuthStorage(): Promise<void> {
  await ExpoAuthStorageAdapter.removeItem(SUPABASE_AUTH_STORAGE_KEY);
  await safeSecureDelete(SUPABASE_AUTH_STORAGE_KEY);
}
