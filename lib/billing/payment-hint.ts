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
  /** Vencimento da cobrança atual (payment.dueDate). */
  dueDate: string | null;
  value: number | null;
  /** Status técnico Asaas da cobrança (PENDING, CONFIRMED, …). */
  providerStatus: string | null;
  divergence: boolean;
};

/**
 * Monta hint de UI sem misturar PIX / BOLETO / CARTÃO.
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
  providerStatus?: string | null;
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
    providerStatus: (input.providerStatus || "").toUpperCase() || null,
    divergence,
  };

  if (input.requested === "BOLETO") {
    hint.bankSlipUrl = input.bankSlipUrl ?? null;
    hint.invoiceUrl = input.invoiceUrl ?? null;
  } else if (input.requested === "PIX") {
    hint.pixQrCodeImage = input.pixQrCodeImage ?? null;
    hint.pixCopiaECola = input.pixCopiaECola ?? null;
    hint.invoiceUrl = input.invoiceUrl ?? null;
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

export function methodDisplayLabel(type: AsaasBillingType | string | null): string {
  const t = (type || "").toUpperCase();
  if (t === "CREDIT_CARD") return "CARTÃO";
  if (t === "PIX") return "PIX";
  if (t === "BOLETO") return "BOLETO";
  return t || "—";
}

/** Texto amigável + código técnico (não perde o status Asaas). */
export function formatProviderPaymentStatus(
  status: string | null | undefined,
): string {
  const s = (status || "").toUpperCase();
  if (!s) {
    // Sem fabricar CONFIRMED — só comunica ausência de confirmação do provider.
    return "Aguardando confirmação do provedor";
  }
  const map: Record<string, string> = {
    PENDING: "Pendente",
    AWAITING_PAYMENT: "Aguardando pagamento",
    AWAITING_RISK_ANALYSIS: "Em análise",
    CONFIRMED: "Confirmado",
    RECEIVED: "Recebido",
    RECEIVED_IN_CASH: "Recebido em dinheiro",
    OVERDUE: "Vencido",
    REFUNDED: "Estornado",
    REFUND_REQUESTED: "Estorno solicitado",
    CHARGEBACK_REQUESTED: "Chargeback solicitado",
    CHARGEBACK_DISPUTE: "Chargeback em disputa",
    DELETED: "Excluído",
    RESTORED: "Restaurado",
  };
  const friendly = map[s] ?? "Status do provedor";
  return `${friendly} (${s})`;
}

/**
 * Evita contradizer "próxima renovação" com o vencimento da cobrança atual
 * quando as datas forem iguais (mostra só uma semântica).
 */
export function resolveBillingDateLabels(input: {
  currentChargeDue: string | null | undefined;
  nextRenewal: string | null | undefined;
}): {
  currentChargeDue: string | null;
  nextRenewal: string | null;
  sameDate: boolean;
} {
  const current = input.currentChargeDue?.slice(0, 10) || null;
  const next = input.nextRenewal?.slice(0, 10) || null;
  if (current && next && current === next) {
    return { currentChargeDue: current, nextRenewal: null, sameDate: true };
  }
  return { currentChargeDue: current, nextRenewal: next, sameDate: false };
}
