/**
 * Sprint 30.2 — Helpers de token de convite (mesmo padrão de
 * lib/ordens/compartilhamento-service.ts: hash sha256 persistido,
 * token em claro retornado apenas uma vez).
 * Domínio puro (node:crypto) — sem Supabase/Next.
 */

import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;
const PREFIX_LENGTH = 8;

export function generateInviteToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteTokenPrefix(token: string): string {
  return token.slice(0, PREFIX_LENGTH);
}

/**
 * Link global (não sob /{tenant}/…) — o convidado ainda não é membro e o
 * middleware bloquearia rotas de tenant. O token identifica o convite.
 */
export function buildInviteUrlPath(_tenantSlug: string, token: string): string {
  return `/convite/${token}`;
}
