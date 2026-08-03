import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/env/validate";

const STORAGE_KEY = "gof.supabase.auth";

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error("Supabase não configurado (EXPO_PUBLIC_SUPABASE_URL / ANON_KEY)");
  }

  client = createClient(url, anonKey, {
    auth: {
      storage: SecureStoreAdapter,
      storageKey: STORAGE_KEY,
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
