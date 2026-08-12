import type { AsaasBillingType } from "@/lib/billing/asaas/types";

export type PaymentHint = {
  /** Método solicitado pelo OWNER (fonte da UI). */
  requestedBillingType: AsaasBillingType;
  /** billingType do provider quando conhecido. */
  providerBillingType: string | null;
  billingType: AsaasBillingType;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  pixQrCodeImage: string | null;
  pixCopiaECola: string | null;
  dueDate: string | null;
  value: number | null;
  divergence: boolean;
};

/**
 * Monta hint de UI sem misturar PIX e BOLETO.
 * Fonte da verdade do rótulo: requestedBillingType.
 */
export function buildPaymentHint(input: {
  requested: AsaasBillingType;
  providerBillingType?: string | null;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  pixQrCodeImage?: string | null;
  pixCopiaECola?: string | null;
  dueDate?: string | null;
  value?: number | null;
}): PaymentHint {
  const provider = (input.providerBillingType || "").toUpperCase() || null;
  const divergence = Boolean(
    provider && provider !== input.requested && provider !== "UNDEFINED",
  );

  const hint: PaymentHint = {
    requestedBillingType: input.requested,
    providerBillingType: provider,
    billingType: input.requested,
    invoiceUrl: input.invoiceUrl ?? null,
    bankSlipUrl: null,
    pixQrCodeImage: null,
    pixCopiaECola: null,
    dueDate: input.dueDate ?? null,
    value: input.value ?? null,
    divergence,
  };

  if (input.requested === "BOLETO") {
    hint.bankSlipUrl = input.bankSlipUrl ?? null;
    hint.invoiceUrl = input.invoiceUrl ?? null;
  } else if (input.requested === "PIX") {
    hint.pixQrCodeImage = input.pixQrCodeImage ?? null;
    hint.pixCopiaECola = input.pixCopiaECola ?? null;
    hint.invoiceUrl = input.invoiceUrl ?? null;
    // Nunca anexar bankSlipUrl em PIX
    hint.bankSlipUrl = null;
  } else if (input.requested === "CREDIT_CARD") {
    hint.invoiceUrl = input.invoiceUrl ?? null;
    hint.bankSlipUrl = null;
  }

  return hint;
}

export function shouldShowBoletoLink(hint: PaymentHint): boolean {
  return hint.billingType === "BOLETO" && Boolean(hint.bankSlipUrl);
}

export function shouldShowPixPayload(hint: PaymentHint): boolean {
  return (
    hint.billingType === "PIX" &&
    Boolean(hint.pixCopiaECola || hint.pixQrCodeImage)
  );
}
