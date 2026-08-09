/**
 * Resolução da base da API mobile (rotas Next.js `/api/mobile/v1/*`).
 * NÃO usar a URL do Supabase aqui.
 */

export const OFFICIAL_MOBILE_API_ORIGIN = "https://gestao-no-foco.vercel.app";

export type ApiBaseIssueCode =
  | "OK"
  | "API_BASE_MISSING"
  | "API_BASE_IS_SUPABASE"
  | "API_BASE_INVALID";

export type ApiBaseResolution = {
  /** Origin efetiva para fetch (sem path). */
  url: string;
  code: ApiBaseIssueCode;
  /** true quando a env estava errada e foi corrigida para a origin oficial. */
  corrected: boolean;
};

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

export function isSupabaseHost(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return host.endsWith(".supabase.co") || host.includes("supabase.co");
}

/**
 * Decide a base correta para `/api/mobile/v1/*`.
 * Se a env apontar para o projeto Supabase, isso é misconfig — usa a origin Web oficial.
 */
export function resolveMobileApiBaseUrl(input: {
  apiBase?: string | null;
  supabaseUrl?: string | null;
}): ApiBaseResolution {
  const api = input.apiBase?.trim() || "";
  const supabase = input.supabaseUrl?.trim() || "";

  if (!api) {
    return {
      url: OFFICIAL_MOBILE_API_ORIGIN,
      code: "API_BASE_MISSING",
      corrected: true,
    };
  }

  let normalized = api.replace(/\/+$/, "");
  normalized = normalized.replace(/\/rest\/v1\/?$/i, "");
  normalized = normalized.replace(/\/+$/, "");

  const apiHost = hostOf(normalized);
  if (!apiHost) {
    return {
      url: OFFICIAL_MOBILE_API_ORIGIN,
      code: "API_BASE_INVALID",
      corrected: true,
    };
  }

  if (isSupabaseHost(normalized)) {
    return {
      url: OFFICIAL_MOBILE_API_ORIGIN,
      code: "API_BASE_IS_SUPABASE",
      corrected: true,
    };
  }

  if (supabase) {
    const supabaseHost = hostOf(supabase);
    if (supabaseHost && apiHost === supabaseHost) {
      return {
        url: OFFICIAL_MOBILE_API_ORIGIN,
        code: "API_BASE_IS_SUPABASE",
        corrected: true,
      };
    }
  }

  return { url: normalized, code: "OK", corrected: false };
}
