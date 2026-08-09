import { publicEnvSchema, type PublicEnv } from "@gof/schemas";

import {
  OFFICIAL_MOBILE_API_ORIGIN,
  resolveMobileApiBaseUrl,
  type ApiBaseResolution,
} from "@/env/api-base";
import { normalizePublicUrl } from "@/env/urls";
import { logger } from "@/observability/logger";

export { normalizePublicUrl } from "@/env/urls";
export {
  OFFICIAL_MOBILE_API_ORIGIN,
  resolveMobileApiBaseUrl,
  isSupabaseHost,
} from "@/env/api-base";
export type { ApiBaseIssueCode, ApiBaseResolution } from "@/env/api-base";

let cached: PublicEnv | null = null;
let envError: string | null = null;
let apiBaseResolution: ApiBaseResolution | null = null;

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function getPublicEnv(): PublicEnv {
  if (cached) return cached;

  const raw = {
    EXPO_PUBLIC_API_BASE_URL: emptyToUndefined(
      process.env.EXPO_PUBLIC_API_BASE_URL,
    ),
    EXPO_PUBLIC_APP_ENV: emptyToUndefined(process.env.EXPO_PUBLIC_APP_ENV),
    EXPO_PUBLIC_SUPABASE_URL: emptyToUndefined(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
    ),
    EXPO_PUBLIC_SUPABASE_ANON_KEY: emptyToUndefined(
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };

  const parsed = publicEnvSchema.safeParse(raw);
  if (!parsed.success) {
    envError = "invalid_public_env";
    logger.warn("env.invalid", {
      issues: parsed.error.issues.map((i) => i.path.join(".")).slice(0, 8),
    });
    cached = {
      EXPO_PUBLIC_APP_ENV: "preview",
    };
    apiBaseResolution = resolveMobileApiBaseUrl({
      apiBase: undefined,
      supabaseUrl: undefined,
    });
    return cached;
  }

  const data = { ...parsed.data };
  if (data.EXPO_PUBLIC_API_BASE_URL) {
    data.EXPO_PUBLIC_API_BASE_URL = normalizePublicUrl(
      data.EXPO_PUBLIC_API_BASE_URL,
    );
  }
  if (data.EXPO_PUBLIC_SUPABASE_URL) {
    data.EXPO_PUBLIC_SUPABASE_URL = normalizePublicUrl(
      data.EXPO_PUBLIC_SUPABASE_URL,
    );
  }

  cached = data;
  envError = null;
  apiBaseResolution = resolveMobileApiBaseUrl({
    apiBase: data.EXPO_PUBLIC_API_BASE_URL,
    supabaseUrl: data.EXPO_PUBLIC_SUPABASE_URL,
  });

  logger.info("env.loaded", {
    appEnv: data.EXPO_PUBLIC_APP_ENV,
    hasApiBase: Boolean(data.EXPO_PUBLIC_API_BASE_URL),
    hasSupabaseUrl: Boolean(data.EXPO_PUBLIC_SUPABASE_URL),
    hasAnonKey: Boolean(data.EXPO_PUBLIC_SUPABASE_ANON_KEY),
    apiHttps: data.EXPO_PUBLIC_API_BASE_URL?.startsWith("https://") ?? false,
    supabaseHttps:
      data.EXPO_PUBLIC_SUPABASE_URL?.startsWith("https://") ?? false,
    apiBaseCode: apiBaseResolution.code,
    apiBaseCorrected: apiBaseResolution.corrected,
    apiBaseHost: (() => {
      try {
        return new URL(apiBaseResolution.url).host;
      } catch {
        return "invalid";
      }
    })(),
  });

  if (apiBaseResolution.corrected) {
    logger.warn("env.api_base_corrected", {
      code: apiBaseResolution.code,
      // não logar URL completa sensível demais; só host oficial esperado
      effectiveHost: new URL(OFFICIAL_MOBILE_API_ORIGIN).host,
    });
  }

  return cached;
}

export function getEnvValidationError(): string | null {
  getPublicEnv();
  return envError;
}

export function getApiBaseResolution(): ApiBaseResolution {
  getPublicEnv();
  return (
    apiBaseResolution ??
    resolveMobileApiBaseUrl({
      apiBase: undefined,
      supabaseUrl: undefined,
    })
  );
}

/**
 * Origin usada pelo cliente HTTP mobile (`/api/mobile/v1/*`).
 * Nunca retorna a URL do Supabase, mesmo se a env estiver errada.
 */
export function getApiBaseUrl(): string {
  return getApiBaseResolution().url;
}

/** Valor bruto da env (pode estar incorreto). Só para diagnóstico. */
export function getConfiguredApiBaseUrlRaw(): string | undefined {
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
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function isMobileApiBaseHealthy(): boolean {
  const res = getApiBaseResolution();
  return res.code === "OK" || res.corrected;
}

/** Testes. */
export function __resetPublicEnvCacheForTests(): void {
  cached = null;
  envError = null;
  apiBaseResolution = null;
}
