import {
  assertAsaasKeyIsolation,
  getAsaasApiBaseUrl,
  getAsaasApiKey,
  getAsaasEnvMode,
  getAsaasWebhookToken,
  hasProductionCredentialSlots,
  isAsaasCheckoutEnabled,
  isAsaasProductionAllowed,
  isAsaasSandbox,
  isBillingEnforcementEnabled,
  isRealChargesAuthorized,
  isRealProductionChargeAllowed,
} from "./config.ts";
import { COMMERCIAL_CATALOG, SANDBOX_HOMOLOGATION_AMOUNT_CENTS } from "./catalog.ts";

export type ReadinessCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

/**
 * Auditoria de readiness. Nunca inclui valores de secrets.
 * readyForRealMicrotransaction permanece false sem os três gates humanos
 * (production env + allow + real charges) — estado atual: NO-GO.
 */
export function auditProductionReadiness(): {
  asaasEnv: "sandbox" | "production";
  sandboxMode: boolean;
  realChargesAuthorized: boolean;
  productionChargeAllowed: boolean;
  checkoutEnabled: boolean;
  enforcementEnabled: boolean;
  readyForRealMicrotransaction: boolean;
  checks: ReadinessCheck[];
} {
  const asaasEnv = getAsaasEnvMode();
  const sandboxMode = isAsaasSandbox();
  const realChargesAuthorized = isRealChargesAuthorized();
  const productionChargeAllowed = isRealProductionChargeAllowed();
  const checkoutEnabled = isAsaasCheckoutEnabled();
  const enforcementEnabled = isBillingEnforcementEnabled();
  const slots = hasProductionCredentialSlots();

  let keyIsolationOk = true;
  let keyIsolationDetail = "Chaves sandbox e production não coincidem (ou production ausente).";
  try {
    assertAsaasKeyIsolation();
  } catch (err) {
    keyIsolationOk = false;
    keyIsolationDetail =
      err instanceof Error ? err.message : "Isolamento de chaves falhou.";
  }

  let hostOk = true;
  let hostDetail = "Host Asaas consistente com ASAAS_ENV.";
  try {
    const base = getAsaasApiBaseUrl();
    const productionHost = /api\.asaas\.com/i.test(base) && !/sandbox/i.test(base);
    if (sandboxMode && productionHost) {
      hostOk = false;
      hostDetail = "Sandbox não pode usar host production.";
    } else {
      hostDetail = sandboxMode ? "Host sandbox." : "Host production.";
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Host Asaas bloqueado.";
    if (sandboxMode) {
      hostOk = false;
      hostDetail = message;
    } else if (!isAsaasProductionAllowed()) {
      hostOk = true;
      hostDetail =
        "Production host bloqueado sem ASAAS_ALLOW_PRODUCTION (fail-closed).";
    } else {
      hostOk = false;
      hostDetail = message;
    }
  }

  const productionKeyPresent = asaasEnv === "production" && Boolean(getAsaasApiKey());
  const productionTokenPresent =
    asaasEnv === "production" && Boolean(getAsaasWebhookToken());

  const catalogOk =
    COMMERCIAL_CATALOG.length === 4 &&
    COMMERCIAL_CATALOG[0]?.amountCents === 27990 &&
    COMMERCIAL_CATALOG[1]?.amountCents === 47990 &&
    COMMERCIAL_CATALOG[2]?.amountCents === 74990 &&
    COMMERCIAL_CATALOG[3]?.amountCents === 349990 &&
    SANDBOX_HOMOLOGATION_AMOUNT_CENTS === 1990;

  const checks: ReadinessCheck[] = [
    {
      id: "sandbox-default",
      ok: sandboxMode,
      detail: sandboxMode
        ? "ASAAS_ENV=sandbox (estado atual obrigatório desta sprint)."
        : "ASAAS_ENV=production — cutover não autorizado nesta sprint.",
    },
    {
      id: "real-charges-off",
      ok: !realChargesAuthorized,
      detail: realChargesAuthorized
        ? "BILLING_REAL_CHARGES_ENABLED=1 — cobrança real ligada."
        : "BILLING_REAL_CHARGES_ENABLED fail-closed (OFF).",
    },
    {
      id: "production-allow-off",
      ok: !isAsaasProductionAllowed(),
      detail: isAsaasProductionAllowed()
        ? "ASAAS_ALLOW_PRODUCTION=1."
        : "ASAAS_ALLOW_PRODUCTION ausente (fail-closed).",
    },
    {
      id: "key-isolation",
      ok: keyIsolationOk,
      detail: keyIsolationDetail,
    },
    {
      id: "host-consistency",
      ok: sandboxMode ? hostOk : hostOk,
      detail: hostDetail,
    },
    {
      id: "production-key-slot",
      ok: asaasEnv !== "production" || productionKeyPresent,
      detail:
        asaasEnv === "production"
          ? productionKeyPresent
            ? "ASAAS_API_KEY_PRODUCTION presente (valor não exibido)."
            : "ASAAS_API_KEY_PRODUCTION ausente — production não reutiliza chave sandbox."
          : "Slot ASAAS_API_KEY_PRODUCTION não exigido em sandbox.",
    },
    {
      id: "production-webhook-slot",
      ok: asaasEnv !== "production" || productionTokenPresent,
      detail:
        asaasEnv === "production"
          ? productionTokenPresent
            ? "ASAAS_WEBHOOK_TOKEN_PRODUCTION presente (valor não exibido)."
            : "ASAAS_WEBHOOK_TOKEN_PRODUCTION ausente — token sandbox não autoriza production."
          : "Slot ASAAS_WEBHOOK_TOKEN_PRODUCTION não exigido em sandbox.",
    },
    {
      id: "catalog",
      ok: catalogOk,
      detail: catalogOk
        ? "Catálogo comercial 27990/47990/74990/349990; 1990 só homologação sandbox."
        : "Catálogo comercial inconsistente.",
    },
    {
      id: "enforcement-off",
      ok: !enforcementEnabled,
      detail: enforcementEnabled
        ? "BILLING_ENFORCEMENT ligado."
        : "Enforcement comercial desligado.",
    },
    {
      id: "checkout-sandbox-only",
      ok: sandboxMode ? true : !checkoutEnabled || productionChargeAllowed,
      detail: sandboxMode
        ? checkoutEnabled
          ? "Checkout sandbox opt-in ativo (regressão técnica)."
          : "Checkout sandbox opt-in desligado."
        : "Checkout production só com combinação completa de gates.",
    },
    {
      id: "production-charge-combination",
      ok: !productionChargeAllowed,
      detail: productionChargeAllowed
        ? "Cobrança real permitida pela combinação de gates."
        : "Cobrança real bloqueada — combinação de gates incompleta (esperado).",
    },
    {
      id: "production-slots-unused-in-sandbox",
      ok: sandboxMode,
      detail: sandboxMode
        ? `Slots production no processo: apiKey=${slots.apiKey ? "presente" : "ausente"}, webhook=${slots.webhookToken ? "presente" : "ausente"} (sandbox não os usa).`
        : "Modo production ativo.",
    },
  ];

  const readyForRealMicrotransaction = Boolean(
    productionChargeAllowed &&
      productionKeyPresent &&
      productionTokenPresent &&
      keyIsolationOk &&
      catalogOk,
  );

  return {
    asaasEnv,
    sandboxMode,
    realChargesAuthorized,
    productionChargeAllowed,
    checkoutEnabled,
    enforcementEnabled,
    readyForRealMicrotransaction,
    checks,
  };
}
