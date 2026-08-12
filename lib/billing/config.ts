/**
 * Sprint 33.4 — config Asaas + billing (server-only).
 * Nenhuma secret com NEXT_PUBLIC_.
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

export function getAsaasApiBaseUrl(): string {
  const override = process.env.ASAAS_API_BASE_URL?.trim();
  if (override) {
    // Override só em sandbox path a menos que production liberada
    if (
      /api\.asaas\.com/i.test(override) &&
      !/sandbox/i.test(override) &&
      !isAsaasProductionAllowed()
    ) {
      throw new Error(
        "ASAAS_API_BASE_URL aponta para production sem ASAAS_ALLOW_PRODUCTION=1",
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

export function getAsaasApiKey(): string | null {
  const key = process.env.ASAAS_API_KEY?.trim();
  return key || null;
}

export function getAsaasWebhookToken(): string | null {
  const t = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  return t || null;
}

export function isAsaasConfigured(): boolean {
  return (
    getConfiguredBillingProvider() === "asaas" &&
    Boolean(getAsaasApiKey() && getAsaasWebhookToken())
  );
}

/**
 * Checkout Asaas só com provider asaas + secrets + sandbox (ou production liberada).
 * Default: não chama API se secrets ausentes.
 */
export function isAsaasCheckoutEnabled(): boolean {
  if (!isAsaasConfigured()) return false;
  if (getAsaasEnvMode() === "production" && !isAsaasProductionAllowed()) {
    return false;
  }
  // Opt-in explícito para chamadas de criação (evita cobrança acidental)
  return process.env.BILLING_ASAAS_CHECKOUT_ENABLED === "1";
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

/** Lista exata do que Renato precisa configurar (sem inventar valores). */
export function listMissingAsaasCredentials(): string[] {
  const missing: string[] = [];
  if (getConfiguredBillingProvider() !== "asaas") {
    missing.push("BILLING_PROVIDER=asaas");
  }
  if (!getAsaasApiKey()) missing.push("ASAAS_API_KEY (sandbox)");
  if (!getAsaasWebhookToken()) missing.push("ASAAS_WEBHOOK_TOKEN");
  if (!process.env.ASAAS_ENV) {
    // não obrigatório (default sandbox), mas documentado
  }
  if (process.env.BILLING_ASAAS_CHECKOUT_ENABLED !== "1") {
    missing.push("BILLING_ASAAS_CHECKOUT_ENABLED=1 (opt-in checkout sandbox)");
  }
  return missing;
}
