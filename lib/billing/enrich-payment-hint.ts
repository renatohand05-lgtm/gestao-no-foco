import "server-only";

import {
  listSubscriptionPayments,
  pickPaymentForBillingType,
} from "@/lib/billing/asaas/subscriptions";
import type { AsaasBillingType } from "@/lib/billing/asaas/types";
import {
  buildPaymentHint,
  type PaymentHint,
} from "@/lib/billing/payment-hint";
import { isAsaasCheckoutEnabled, isAsaasConfigured } from "@/lib/billing/config";
import { logger } from "@/lib/observability/logger";

/**
 * Atualiza status/URLs da última cobrança a partir do Asaas (sandbox/produção liberada).
 * Não marca assinatura active — só enriquece o card de cobrança.
 */
export async function enrichPaymentHintFromProvider(input: {
  providerSubscriptionId: string | null | undefined;
  hint: PaymentHint | null;
  tenantId: string;
}): Promise<PaymentHint | null> {
  if (!input.hint) return null;
  if (!input.providerSubscriptionId) return input.hint;
  if (!isAsaasConfigured() || !isAsaasCheckoutEnabled()) return input.hint;

  const requestId = crypto.randomUUID();
  try {
    const pays = await listSubscriptionPayments({
      subscriptionId: input.providerSubscriptionId,
      requestId,
    });
    const matched = pickPaymentForBillingType(
      pays.data,
      input.hint.billingType as AsaasBillingType,
    );
    if (!matched) return input.hint;

    return buildPaymentHint({
      requested: input.hint.billingType,
      providerBillingType: matched.billingType || input.hint.providerBillingType,
      invoiceUrl: matched.invoiceUrl ?? input.hint.invoiceUrl,
      bankSlipUrl: matched.bankSlipUrl ?? input.hint.bankSlipUrl,
      pixQrCodeImage: input.hint.pixQrCodeImage,
      pixCopiaECola: input.hint.pixCopiaECola,
      dueDate: matched.dueDate ?? input.hint.dueDate,
      value: matched.value ?? input.hint.value,
      providerStatus: matched.status ?? input.hint.providerStatus,
    });
  } catch (err) {
    logger.info("billing.payment_hint.enrich_skipped", {
      requestId,
      tenantId: input.tenantId,
      reason: err instanceof Error ? err.message.slice(0, 120) : "error",
    });
    return input.hint;
  }
}
