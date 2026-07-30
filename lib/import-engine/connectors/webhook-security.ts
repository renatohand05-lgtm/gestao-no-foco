/**
 * Sprint 22.8 — Segurança de webhooks: assinatura HMAC, replay e idempotência.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type WebhookVerifyOptions = {
  maxSkewSeconds?: number;
  now?: number;
};

export type WebhookVerifyResult = {
  valid: boolean;
  reason?: string;
};

const DEFAULT_MAX_SKEW = 300;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function normalizeSignature(header: string): string {
  const trimmed = header.trim();
  const parts = trimmed.split("=");
  if (parts.length === 2 && /^v\d+$/i.test(parts[0])) {
    return parts[1];
  }
  return trimmed;
}

/**
 * Verifica assinatura HMAC-SHA256 do corpo bruto.
 * Formato esperado: header `X-Import-Signature` com hex ou `v1=<hex>`.
 */
export function verifyWebhookSignature(
  secret: string,
  rawBody: string | Buffer,
  signatureHeader: string,
  timestampHeader: string,
  options: WebhookVerifyOptions = {},
): WebhookVerifyResult {
  const maxSkew = options.maxSkewSeconds ?? DEFAULT_MAX_SKEW;
  const nowSec = Math.floor((options.now ?? Date.now()) / 1000);
  const ts = Number.parseInt(timestampHeader, 10);

  if (!Number.isFinite(ts)) {
    return { valid: false, reason: "timestamp_invalid" };
  }

  if (Math.abs(nowSec - ts) > maxSkew) {
    return { valid: false, reason: "timestamp_skew" };
  }

  if (!secret || secret.length < 8) {
    return { valid: false, reason: "secret_invalid" };
  }

  const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
  const payload = `${ts}.${bodyStr}`;
  const expected = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  const provided = normalizeSignature(signatureHeader);

  if (!safeEqual(expected, provided)) {
    return { valid: false, reason: "signature_mismatch" };
  }

  return { valid: true };
}

/** Gera assinatura (uso em testes/clientes). */
export function signWebhookPayload(
  secret: string,
  rawBody: string | Buffer,
  timestampSec: number,
): string {
  const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
  const payload = `${timestampSec}.${bodyStr}`;
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

const seenIdempotencyKeys = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function purgeExpiredIdempotency(now: number): void {
  for (const [key, expiresAt] of seenIdempotencyKeys) {
    if (expiresAt <= now) seenIdempotencyKeys.delete(key);
  }
}

/** Retorna true se a chave já foi processada (replay/idempotência). */
export function isDuplicateIdempotencyKey(key: string, now = Date.now()): boolean {
  purgeExpiredIdempotency(now);
  return seenIdempotencyKeys.has(key);
}

/** Registra chave de idempotência após processamento bem-sucedido. */
export function registerIdempotencyKey(key: string, now = Date.now()): void {
  purgeExpiredIdempotency(now);
  seenIdempotencyKeys.set(key, now + IDEMPOTENCY_TTL_MS);
}

export function buildIdempotencyKey(
  tenantId: string,
  connectorId: string,
  externalId: string,
): string {
  return `${tenantId}:${connectorId}:${externalId}`;
}

export function extractIdempotencyHeader(headers: Record<string, string | undefined>): string | null {
  return (
    headers["x-idempotency-key"] ??
    headers["X-Idempotency-Key"] ??
    headers["idempotency-key"] ??
    null
  );
}

/** Limpa cache (testes). */
export function resetWebhookIdempotencyCache(): void {
  seenIdempotencyKeys.clear();
}
