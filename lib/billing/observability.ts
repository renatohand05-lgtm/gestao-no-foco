import { logger } from "@/lib/observability/logger";

/** Eventos canônicos de billing (sem secrets). */
export const BILLING_EVENTS = {
  checkoutRequested: "billing.checkout_requested",
  checkoutCreated: "billing.checkout_created",
  providerCustomerCreated: "billing.provider_customer_created",
  providerSubscriptionCreated: "billing.provider_subscription_created",
  providerPaymentCreated: "billing.provider_payment_created",
  webhookReceived: "billing.webhook_received",
  webhookAuthenticated: "billing.webhook_authenticated",
  webhookRejected: "billing.webhook_rejected",
  webhookDuplicate: "billing.webhook_duplicate",
  billingStateChanged: "billing.billing_state_changed",
  providerError: "billing.provider_error",
  billingGuardBlocked: "billing.billing_guard_blocked",
  killSwitchTriggered: "billing.kill_switch_triggered",
} as const;

export type BillingLogContext = {
  requestId?: string;
  correlationId?: string;
  tenantId?: string;
  operation?: string;
  providerStatus?: string | null;
  eventIdHash?: string;
  paymentId?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
  reason?: string;
  sandbox?: boolean;
  [key: string]: unknown;
};

export function logBilling(
  event: string,
  context: BillingLogContext,
  level: "info" | "warn" = "info",
): void {
  const correlationId = context.correlationId || context.requestId;
  const payload = { ...context, correlationId };
  if (level === "warn") logger.warn(event, payload);
  else logger.info(event, payload);
}
