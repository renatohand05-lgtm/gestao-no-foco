import { isAsaasProductionApiKeyBlockedExternally } from "./external-blockers.ts";
import {
  getAsaasEnvMode,
  hasProductionCredentialSlots,
  isAsaasCheckoutEnabled,
  isAsaasConfigured,
  isAsaasSandbox,
  isBillingProviderConfigured,
  isRealChargesAuthorized,
  isRealProductionChargeAllowed,
} from "./config.ts";

/**
 * Status operacional server-side. Nunca inclui valores de secrets.
 * Não expor em endpoint público anônimo.
 */
export function getBillingOperationalStatus(): {
  providerConfigured: boolean;
  environment: "sandbox" | "production";
  sandbox: boolean;
  checkoutEnabled: boolean;
  realChargesEnabled: boolean;
  productionChargeAllowed: boolean;
  productionApiKeyPresent: boolean;
  productionWebhookTokenPresent: boolean;
  serviceRoleAvailable: boolean;
  asaasConfiguredForCurrentEnv: boolean;
  productionApiKeyBlockedExternally: boolean;
} {
  const slots = hasProductionCredentialSlots();
  return {
    providerConfigured: isBillingProviderConfigured(),
    environment: getAsaasEnvMode(),
    sandbox: isAsaasSandbox(),
    checkoutEnabled: isAsaasCheckoutEnabled(),
    realChargesEnabled: isRealChargesAuthorized(),
    productionChargeAllowed: isRealProductionChargeAllowed(),
    productionApiKeyPresent: slots.apiKey,
    productionWebhookTokenPresent: slots.webhookToken,
    serviceRoleAvailable: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    asaasConfiguredForCurrentEnv: isAsaasConfigured(),
    productionApiKeyBlockedExternally:
      isAsaasProductionApiKeyBlockedExternally(),
  };
}
