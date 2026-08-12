/**
 * Sprint 33.3 — flags de billing (server-only sensíveis).
 * Nenhuma secret de provedor com NEXT_PUBLIC_.
 */

export function isBillingEnforcementEnabled(): boolean {
  return process.env.BILLING_ENFORCEMENT === "1";
}

export function getConfiguredBillingProvider(): string {
  const raw = (process.env.BILLING_PROVIDER || "none").trim().toLowerCase();
  return raw || "none";
}

export function isBillingProviderConfigured(): boolean {
  const provider = getConfiguredBillingProvider();
  if (provider === "none") return false;
  // Credenciais por provedor (nenhuma no frontend)
  if (provider === "stripe") {
    return Boolean(
      process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
    );
  }
  if (provider === "asaas") {
    return Boolean(
      process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_TOKEN,
    );
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
    process.env.ASAAS_WEBHOOK_TOKEN ||
    process.env.MERCADOPAGO_WEBHOOK_SECRET ||
    null
  );
}
