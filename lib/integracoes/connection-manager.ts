/**
 * Sprint 30.8 — Connection Manager blueprints (sem secrets).
 */

import type { ConnectionBlueprint } from "./types.ts";

export const CONNECTION_BLUEPRINTS: readonly ConnectionBlueprint[] = [
  {
    id: "auth-oauth",
    method: "oauth",
    label: "OAuth 2.0",
    scopesSupported: true,
    keyRotationSupported: true,
    storesSecrets: false,
    notes: "Fluxo arquitetural — tokens reais não são persistidos nesta sprint.",
  },
  {
    id: "auth-api-key",
    method: "api_key",
    label: "API Key",
    scopesSupported: false,
    keyRotationSupported: true,
    storesSecrets: false,
    notes: "Placeholder de rotação — sem armazenamento de chave.",
  },
  {
    id: "auth-basic",
    method: "basic",
    label: "Basic Auth",
    scopesSupported: false,
    keyRotationSupported: true,
    storesSecrets: false,
    notes: "Somente contrato.",
  },
  {
    id: "auth-bearer",
    method: "bearer",
    label: "Bearer Token",
    scopesSupported: true,
    keyRotationSupported: true,
    storesSecrets: false,
    notes: "Somente contrato.",
  },
  {
    id: "auth-webhook",
    method: "webhook_secret",
    label: "Webhook Secret",
    scopesSupported: false,
    keyRotationSupported: true,
    storesSecrets: false,
    notes: "HMAC planejado — sem secret em produção nesta fase.",
  },
  {
    id: "auth-refresh",
    method: "refresh_token",
    label: "Refresh Token",
    scopesSupported: true,
    keyRotationSupported: true,
    storesSecrets: false,
    notes: "Rotação planejada — sem persistência real.",
  },
] as const;

export function assertNoSecretStorage(): boolean {
  return CONNECTION_BLUEPRINTS.every((c) => c.storesSecrets === false);
}
