import { getApiBaseUrl } from "@/env/validate";

const OFFICIAL_WEB = "https://gestao-no-foco.vercel.app";

/**
 * Abre módulos web ainda não nativos (quick actions).
 * Preferência: API base mobile resolvida (nunca Supabase).
 */
export function resolveWebOrigin(): string {
  const base = getApiBaseUrl()?.replace(/\/$/, "");
  if (base && !/localhost|127\.0\.0\.1/i.test(base)) return base;
  return OFFICIAL_WEB;
}

export function webHref(path: string): string {
  const origin = resolveWebOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}
