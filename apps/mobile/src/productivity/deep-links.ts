import type { DeepLinkResolution } from "@/productivity/types";

const ALLOWED_INTERNAL = [
  /^\/$/,
  /^\/inteligencia$/,
  /^\/crm(\/.*)?$/,
  /^\/estoque(\/.*)?$/,
  /^\/operacao(\/.*)?$/,
  /^\/financeiro(\/.*)?$/,
  /^\/profile$/,
  /^\/settings$/,
  /^\/busca$/,
  /^\/comandos$/,
  /^\/scanner$/,
];

/**
 * Resolve deep link interno protegido (scheme gof:// ou path relativo).
 * Não permite open redirect externo.
 */
export function resolveInternalDeepLink(raw: string): DeepLinkResolution {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "vazio" };

  let path = trimmed;
  if (/^gof:\/\//i.test(trimmed)) {
    path = trimmed.replace(/^gof:\/\//i, "/");
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return { ok: false, reason: "URL externa bloqueada" };
  }
  if (!path.startsWith("/")) path = `/${path}`;
  // strip query for allowlist (query kept separately if needed)
  const pathname = path.split("?")[0] ?? path;
  if (pathname.includes("..") || pathname.includes("//")) {
    return { ok: false, reason: "path inválido" };
  }
  const allowed = ALLOWED_INTERNAL.some((re) => re.test(pathname));
  if (!allowed) {
    return { ok: false, reason: "rota não permitida" };
  }
  return { ok: true, route: path, opensWeb: false };
}

export function parseScanToQuery(code: string): string {
  return code.trim().slice(0, 80);
}
