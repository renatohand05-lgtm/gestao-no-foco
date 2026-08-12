import type { BillingSubscriptionStatus } from "../types.ts";

/**
 * Mapeia eventos/status Asaas → status interno.
 * Nunca converte desconhecido para active.
 */
export function mapAsaasEventToInternalStatus(input: {
  event: string;
  subscriptionStatus?: string | null;
  paymentStatus?: string | null;
}): BillingSubscriptionStatus | "ignore" | "unknown" {
  const event = input.event.trim().toUpperCase();

  switch (event) {
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED":
      return "active";
    case "PAYMENT_OVERDUE":
      return "past_due";
    case "PAYMENT_REFUNDED":
      return "canceled";
    case "PAYMENT_CREATED":
    case "PAYMENT_DELETED":
    case "PAYMENT_RESTORED":
      return "ignore";
    case "SUBSCRIPTION_CREATED":
      // Criação ≠ pagamento. Mantém trial/estado atual via ignore.
      return "ignore";
    case "SUBSCRIPTION_UPDATED": {
      const s = (input.subscriptionStatus || "").toUpperCase();
      if (s === "ACTIVE") return "active";
      if (s === "EXPIRED" || s === "INACTIVE") return "past_due";
      if (s === "DELETED") return "canceled";
      return "unknown";
    }
    case "SUBSCRIPTION_INACTIVATED":
    case "SUBSCRIPTION_DELETED":
      return "canceled";
    default:
      return "unknown";
  }
}

export function mapAsaasSubscriptionStatus(
  status: string | null | undefined,
): BillingSubscriptionStatus | "unknown" {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE") return "active";
  if (s === "EXPIRED" || s === "INACTIVE") return "past_due";
  if (s === "DELETED") return "canceled";
  return "unknown";
}
