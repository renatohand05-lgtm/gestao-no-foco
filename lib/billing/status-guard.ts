import type { BillingSubscriptionStatus } from "./types.ts";

/**
 * Impede regressão de estado financeiro confirmado por evento fora de ordem.
 * past_due após active é transição comercial legítima (fatura seguinte).
 * canceled é terminal via webhook (sem reativar automaticamente).
 */
export function canApplySubscriptionStatus(
  current: BillingSubscriptionStatus,
  next: BillingSubscriptionStatus,
): boolean {
  if (current === next) return true;
  if (current === "active" && next === "trial") return false;
  if (current === "canceled") return false;
  return true;
}

const PAYMENT_RANK: Record<string, number> = {
  PENDING: 1,
  AWAITING_PAYMENT: 1,
  AWAITING_RISK_ANALYSIS: 1,
  OVERDUE: 2,
  CONFIRMED: 3,
  RECEIVED: 3,
  RECEIVED_IN_CASH: 3,
  REFUNDED: 4,
  REFUND_REQUESTED: 4,
  CHARGEBACK_REQUESTED: 4,
  CHARGEBACK_DISPUTE: 4,
  DELETED: 4,
};

/**
 * CONFIRMED/RECEIVED não regride para PENDING por webhook atrasado.
 */
export function canApplyPaymentStatus(
  current: string | null | undefined,
  incoming: string | null | undefined,
): boolean {
  const next = (incoming || "").toUpperCase();
  if (!next) return false;
  const prev = (current || "").toUpperCase();
  if (!prev) return true;
  const a = PAYMENT_RANK[prev] ?? 0;
  const b = PAYMENT_RANK[next] ?? 0;
  if (a >= 3 && b < 3) return false;
  return true;
}

/**
 * Ciclo comercial visível (sem migration): trial + checkout completed = pending.
 */
export function resolveCommercialLifecycle(input: {
  subscriptionStatus: BillingSubscriptionStatus | null;
  checkoutCompleted: boolean;
}): BillingSubscriptionStatus | "pending" {
  if (!input.subscriptionStatus) return "trial";
  if (input.subscriptionStatus === "trial" && input.checkoutCompleted) {
    return "pending";
  }
  return input.subscriptionStatus;
}
