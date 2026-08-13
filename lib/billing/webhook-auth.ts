import { timingSafeEqual } from "node:crypto";

import { getAsaasEnvMode, type AsaasEnvMode } from "./config.ts";

function envTrim(name: string): string | null {
  const v = process.env[name]?.trim();
  return v || null;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export type WebhookAuthResult = {
  ok: boolean;
  reason:
    | "missing_header"
    | "missing_expected_token"
    | "wrong_environment"
    | "invalid"
    | "ok";
  expectedEnv: AsaasEnvMode;
};

/**
 * Token do ambiente atual. Sem fallback para o outro ambiente.
 */
export function getExpectedWebhookToken(): string | null {
  if (getAsaasEnvMode() === "production") {
    return envTrim("ASAAS_WEBHOOK_TOKEN_PRODUCTION");
  }
  return envTrim("ASAAS_WEBHOOK_TOKEN");
}

function getOppositeWebhookToken(): string | null {
  if (getAsaasEnvMode() === "production") {
    return envTrim("ASAAS_WEBHOOK_TOKEN");
  }
  return envTrim("ASAAS_WEBHOOK_TOKEN_PRODUCTION");
}

export function readAsaasWebhookHeader(
  headers: { get(name: string): string | null },
): string {
  return (
    headers.get("asaas-access-token") ||
    headers.get("x-billing-webhook-secret") ||
    headers.get("x-webhook-secret") ||
    ""
  );
}

/**
 * Sandbox não aceita token production. Production não aceita token sandbox.
 * Sem fallback silencioso.
 */
export function authenticateAsaasWebhookHeader(
  header: string,
): WebhookAuthResult {
  const expectedEnv = getAsaasEnvMode();
  if (!header) {
    return { ok: false, reason: "missing_header", expectedEnv };
  }
  const expected = getExpectedWebhookToken();
  if (!expected) {
    return { ok: false, reason: "missing_expected_token", expectedEnv };
  }
  const opposite = getOppositeWebhookToken();
  if (opposite && safeEqual(header, opposite) && !safeEqual(header, expected)) {
    return { ok: false, reason: "wrong_environment", expectedEnv };
  }
  if (safeEqual(header, expected)) {
    return { ok: true, reason: "ok", expectedEnv };
  }
  return { ok: false, reason: "invalid", expectedEnv };
}
