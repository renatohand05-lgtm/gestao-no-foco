import "server-only";

import { headers } from "next/headers";

/**
 * IP do cliente final (não do servidor).
 * Vercel/proxy: x-forwarded-for / x-real-ip / cf-connecting-ip.
 * Sem IP fixo de produção.
 */
export async function resolveClientRemoteIp(): Promise<string> {
  const h = await headers();
  const candidates = [
    firstForwarded(h.get("x-forwarded-for")),
    h.get("x-real-ip")?.trim(),
    h.get("cf-connecting-ip")?.trim(),
    h.get("x-vercel-forwarded-for")
      ? firstForwarded(h.get("x-vercel-forwarded-for"))
      : null,
  ].filter(Boolean) as string[];

  for (const ip of candidates) {
    if (isPublicOrClientIp(ip)) return ip;
  }

  // Local/dev sandbox: permite loopback somente fora de production Asaas.
  const asaasEnv = (process.env.ASAAS_ENV || "sandbox").toLowerCase();
  if (
    asaasEnv !== "production" &&
    process.env.NODE_ENV === "development"
  ) {
    for (const ip of candidates) {
      if (isLoopback(ip)) return ip;
    }
  }

  throw new Error(
    "REMOTE_IP_UNAVAILABLE: não foi possível determinar o IP do cliente.",
  );
}

function firstForwarded(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function isLoopback(value: string): boolean {
  return (
    value === "127.0.0.1" ||
    value === "::1" ||
    value === "0:0:0:0:0:0:0:1"
  );
}

function isPublicOrClientIp(value: string): boolean {
  if (!value || value === "unknown") return false;
  if (isLoopback(value)) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return true;
  if (value.includes(":")) return true;
  return false;
}
