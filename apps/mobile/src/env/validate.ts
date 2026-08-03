import { publicEnvSchema, type PublicEnv } from "@gof/schemas";

let cached: PublicEnv | null = null;

export function getPublicEnv(): PublicEnv {
  if (cached) return cached;
  cached = publicEnvSchema.parse({
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  return cached;
}

export function getApiBaseUrl(): string | undefined {
  return getPublicEnv().EXPO_PUBLIC_API_BASE_URL;
}

export function getAppEnv(): PublicEnv["EXPO_PUBLIC_APP_ENV"] {
  return getPublicEnv().EXPO_PUBLIC_APP_ENV;
}

export function getSupabaseUrl(): string | undefined {
  return getPublicEnv().EXPO_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string | undefined {
  return getPublicEnv().EXPO_PUBLIC_SUPABASE_ANON_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
