/**
 * Config Asaas + billing (server-only).
 * Nenhuma secret com NEXT_PUBLIC_.
 *
 * Gates (fail-closed):
 * A) técnico: BILLING_PROVIDER=asaas + ASAAS_API_KEY + ASAAS_WEBHOOK_TOKEN
 * B) checkout sandbox: A + ASAAS_ENV=sandbox + BILLING_ASAAS_CHECKOUT_ENABLED=1
 * C) cobrança real: ASAAS_ENV=production + ASAAS_ALLOW_PRODUCTION=1
 *    + BILLING_REAL_CHARGES_ENABLED=1 + checkout=1 + keys production distintas
 * Nenhum gate isolado autoriza cobrança real.
 */

export function isBillingEnforcementEnabled(): boolean {
  return process.env.BILLING_ENFORCEMENT === "1";
}

export function getConfiguredBillingProvider(): string {
  const raw = (process.env.BILLING_PROVIDER || "none").trim().toLowerCase();
  return raw || "none";
}

export type AsaasEnvMode = "sandbox" | "production";

export function getAsaasEnvMode(): AsaasEnvMode {
  const raw = (process.env.ASAAS_ENV || "sandbox").trim().toLowerCase();
  return raw === "production" ? "production" : "sandbox";
}

export function isAsaasSandbox(): boolean {
  return getAsaasEnvMode() === "sandbox";
}

/** Bloqueia API production Asaas salvo override explícito. */
export function isAsaasProductionAllowed(): boolean {
  return process.env.ASAAS_ALLOW_PRODUCTION === "1";
}

/**
 * Gate C — cobrança real. Default OFF.
 * Ausente, false, 0, true, yes ou qualquer valor ≠ "1" = OFF.
 */
export function isRealChargesAuthorized(): boolean {
  return process.env.BILLING_REAL_CHARGES_ENABLED === "1";
}

function envTrim(name: string): string | null {
  const v = process.env[name]?.trim();
  return v || null;
}

/**
 * Isolamento sandbox ≠ production.
 * Production NUNCA reutiliza ASAAS_API_KEY / ASAAS_WEBHOOK_TOKEN sandbox.
 */
export function assertAsaasKeyIsolation(): void {
  const sandboxKey = envTrim("ASAAS_API_KEY") || "";
  const productionKey = envTrim("ASAAS_API_KEY_PRODUCTION") || "";
  if (sandboxKey && productionKey && sandboxKey === productionKey) {
    throw new Error(
      "ASAAS_API_KEY_PRODUCTION não pode ser igual à chave sandbox.",
    );
  }
  const sandboxToken = envTrim("ASAAS_WEBHOOK_TOKEN") || "";
  const productionToken = envTrim("ASAAS_WEBHOOK_TOKEN_PRODUCTION") || "";
  if (sandboxToken && productionToken && sandboxToken === productionToken) {
    throw new Error(
      "ASAAS_WEBHOOK_TOKEN_PRODUCTION não pode ser igual ao token sandbox.",
    );
  }
}

function isProductionAsaasHost(url: string): boolean {
  return /api\.asaas\.com/i.test(url) && !/sandbox/i.test(url);
}

export function getAsaasApiBaseUrl(): string {
  const override = process.env.ASAAS_API_BASE_URL?.trim();
  if (override) {
    if (isProductionAsaasHost(override) && !isAsaasProductionAllowed()) {
      throw new Error(
        "ASAAS_API_BASE_URL aponta para production sem ASAAS_ALLOW_PRODUCTION=1",
      );
    }
    if (getAsaasEnvMode() === "sandbox" && isProductionAsaasHost(override)) {
      throw new Error(
        "ASAAS_ENV=sandbox não pode usar endpoint production. Sem fallback.",
      );
    }
    if (
      getAsaasEnvMode() === "production" &&
      /sandbox/i.test(override) &&
      isRealChargesAuthorized()
    ) {
      throw new Error(
        "Cobrança real não pode usar endpoint sandbox. Configuração inconsistente.",
      );
    }
    return override.replace(/\/$/, "");
  }
  if (getAsaasEnvMode() === "production") {
    if (!isAsaasProductionAllowed()) {
      throw new Error(
        "Asaas production bloqueado. Use ASAAS_ENV=sandbox ou ASAAS_ALLOW_PRODUCTION=1.",
      );
    }
    return "https://api.asaas.com";
  }
  return "https://api-sandbox.asaas.com";
}

/**
 * Falha fechada se sandbox/production misturados.
 * Não faz fallback automático para produção.
 */
export function assertAsaasConfigConsistent(): void {
  assertAsaasKeyIsolation();
  const mode = getAsaasEnvMode();
  const base = getAsaasApiBaseUrl();
  if (mode === "sandbox" && isProductionAsaasHost(base)) {
    throw new Error("ASAAS_ENV=sandbox com host production — checkout bloqueado.");
  }
  if (mode === "production" && /sandbox/i.test(base)) {
    throw new Error("ASAAS_ENV=production com host sandbox — configuração inválida.");
  }
}

export function getAsaasApiKey(): string | null {
  if (getAsaasEnvMode() === "production") {
    return envTrim("ASAAS_API_KEY_PRODUCTION");
  }
  return envTrim("ASAAS_API_KEY");
}

export function getAsaasWebhookToken(): string | null {
  if (getAsaasEnvMode() === "production") {
    return envTrim("ASAAS_WEBHOOK_TOKEN_PRODUCTION");
  }
  return envTrim("ASAAS_WEBHOOK_TOKEN");
}

export function isAsaasConfigured(): boolean {
  return (
    getConfiguredBillingProvider() === "asaas" &&
    Boolean(getAsaasApiKey() && getAsaasWebhookToken())
  );
}

/**
 * Checkout Asaas só com provider asaas + secrets + opt-in.
 * Production exige a combinação completa (fail-closed).
 */
export function isAsaasCheckoutEnabled(): boolean {
  if (!isAsaasConfigured()) return false;
  if (process.env.BILLING_ASAAS_CHECKOUT_ENABLED !== "1") return false;
  try {
    assertAsaasConfigConsistent();
  } catch {
    return false;
  }
  if (getAsaasEnvMode() === "production") {
    return isRealProductionChargeAllowed();
  }
  return true;
}

/**
 * Cobrança real só com TODOS os gates. Qualquer um ausente = false.
 * ASAAS_ENV=production sozinho: NÃO.
 * BILLING_REAL_CHARGES_ENABLED sozinho: NÃO.
 */
export function isRealProductionChargeAllowed(): boolean {
  if (getAsaasEnvMode() !== "production") return false;
  if (!isAsaasProductionAllowed()) return false;
  if (!isRealChargesAuthorized()) return false;
  if (process.env.BILLING_ASAAS_CHECKOUT_ENABLED !== "1") return false;
  if (!isAsaasConfigured()) return false;
  try {
    assertAsaasConfigConsistent();
  } catch {
    return false;
  }
  return Boolean(getAsaasApiKey() && getAsaasWebhookToken());
}

/** Presença de slots production (boolean). Nunca devolve o valor. */
export function hasProductionCredentialSlots(): {
  apiKey: boolean;
  webhookToken: boolean;
} {
  return {
    apiKey: Boolean(envTrim("ASAAS_API_KEY_PRODUCTION")),
    webhookToken: Boolean(envTrim("ASAAS_WEBHOOK_TOKEN_PRODUCTION")),
  };
}

export function isBillingProviderConfigured(): boolean {
  const provider = getConfiguredBillingProvider();
  if (provider === "none") return false;
  if (provider === "stripe") {
    return Boolean(
      process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
    );
  }
  if (provider === "asaas") {
    return isAsaasConfigured();
  }
  if (provider === "mercadopago") {
    return Boolean(
      process.env.MERCADOPAGO_ACCESS_TOKEN &&
        process.env.MERCADOPAGO_WEBHOOK_SECRET,
    );
  }
  return Boolean(process.env.BILLING_PROVIDER_SECRET);
}

export function getPilotTrialDays(): number {
  const n = Number(process.env.BILLING_PILOT_TRIAL_DAYS || "30");
  if (!Number.isFinite(n) || n <= 0 || n > 365) return 30;
  return Math.floor(n);
}

export function getBillingWebhookSecret(): string | null {
  return (
    process.env.BILLING_WEBHOOK_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    getAsaasWebhookToken() ||
    process.env.MERCADOPAGO_WEBHOOK_SECRET ||
    null
  );
}

/** Lista exata do que falta (sem inventar valores). */
export function listMissingAsaasCredentials(): string[] {
  const missing: string[] = [];
  if (getConfiguredBillingProvider() !== "asaas") {
    missing.push("BILLING_PROVIDER=asaas");
  }
  if (getAsaasEnvMode() === "production") {
    if (!getAsaasApiKey()) missing.push("ASAAS_API_KEY_PRODUCTION");
    if (!getAsaasWebhookToken()) missing.push("ASAAS_WEBHOOK_TOKEN_PRODUCTION");
  } else {
    if (!getAsaasApiKey()) missing.push("ASAAS_API_KEY (sandbox)");
    if (!getAsaasWebhookToken()) missing.push("ASAAS_WEBHOOK_TOKEN");
  }
  if (process.env.BILLING_ASAAS_CHECKOUT_ENABLED !== "1") {
    missing.push("BILLING_ASAAS_CHECKOUT_ENABLED=1 (opt-in checkout sandbox)");
  }
  return missing;
}
