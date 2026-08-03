/**
 * Canonical public app origin for absolute links (convites, metadata, e-mails).
 * Server preference: APP_URL || NEXT_PUBLIC_APP_URL.
 * Production never emits localhost.
 */

export const PRODUCTION_APP_URL = "https://gestao-no-foco.vercel.app";

export function isLocalhostUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  try {
    const host = new URL(raw.includes("://") ? raw : `http://${raw}`).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return /localhost|127\.0\.0\.1|\[::1\]/i.test(raw);
  }
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function isProductionRuntime(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

/**
 * Base URL pública do app (sem path final).
 * Em produção: nunca retorna localhost — usa fallback oficial se env faltar ou estiver errado.
 */
export function getAppBaseUrl(): string {
  const fromEnv = stripTrailingSlash(
    (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim(),
  );

  if (fromEnv) {
    if (isProductionRuntime() && isLocalhostUrl(fromEnv)) {
      return PRODUCTION_APP_URL;
    }
    return fromEnv;
  }

  if (isProductionRuntime()) {
    return PRODUCTION_APP_URL;
  }

  const vercelUrl = (process.env.VERCEL_URL || "").trim().replace(/^https?:\/\//, "");
  if (vercelUrl) {
    return `https://${stripTrailingSlash(vercelUrl)}`;
  }

  return "http://localhost:3000";
}

/** Junta origin canônica + path absoluto (ex.: `/convite/abc`). */
export function absoluteAppUrl(path: string): string {
  const base = getAppBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
