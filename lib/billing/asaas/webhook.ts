import "server-only";

import { createHash } from "node:crypto";

import { mapAsaasEventToInternalStatus } from "@/lib/billing/asaas/status-map";
import type { AsaasWebhookPayload } from "@/lib/billing/asaas/types";
import { BILLING_EVENTS, logBilling } from "@/lib/billing/observability";
import {
  canApplyPaymentStatus,
  decideWebhookApply,
} from "@/lib/billing/status-guard";
import type { BillingSubscriptionStatus } from "@/lib/billing/types";
import { logger } from "@/lib/observability/logger";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

type Admin = ReturnType<typeof createAdminClient>;

function sanitizeAsaasSummary(payload: AsaasWebhookPayload): Json {
  return {
    event: payload.event ?? null,
    paymentId: payload.payment?.id ?? null,
    subscriptionId:
      payload.subscription?.id ?? payload.payment?.subscription ?? null,
    customerId:
      payload.subscription?.customer ?? payload.payment?.customer ?? null,
    paymentStatus: payload.payment?.status ?? null,
    subscriptionStatus: payload.subscription?.status ?? null,
    billingType:
      payload.payment?.billingType ?? payload.subscription?.billingType ?? null,
    externalReference:
      payload.subscription?.externalReference ?? null,
  };
}

async function findTenantIdForPayload(
  admin: Admin,
  payload: AsaasWebhookPayload,
): Promise<string | null> {
  const ext =
    (typeof payload.subscription?.externalReference === "string" &&
      payload.subscription.externalReference) ||
    null;
  if (ext && /^[0-9a-f-]{36}$/i.test(ext)) return ext;

  const subId =
    payload.subscription?.id ||
    (typeof payload.payment?.subscription === "string"
      ? payload.payment.subscription
      : null);
  if (subId) {
    const { data } = await admin
      .from("billing_subscriptions")
      .select("tenant_id")
      .eq("provider_subscription_id", subId)
      .maybeSingle();
    if (data?.tenant_id) return data.tenant_id;
  }

  const customerId =
    payload.subscription?.customer || payload.payment?.customer || null;
  if (customerId) {
    const { data } = await admin
      .from("billing_subscriptions")
      .select("tenant_id")
      .eq("provider_customer_id", customerId)
      .maybeSingle();
    if (data?.tenant_id) return data.tenant_id;
  }

  return null;
}

/**
 * Processa webhook Asaas com idempotência persistente.
 * Não concede active para eventos desconhecidos.
 */
export async function processAsaasWebhook(input: {
  admin: Admin;
  payload: AsaasWebhookPayload;
  requestId: string;
}): Promise<{
  ok: boolean;
  duplicate?: boolean;
  ignored?: boolean;
  unknown?: boolean;
  statusApplied?: BillingSubscriptionStatus | null;
  code?: string;
}> {
  const eventId = input.payload.id?.trim();
  const event = input.payload.event?.trim();
  if (!eventId) {
    return { ok: false, code: "EVENT_ID_REQUIRED" };
  }
  if (!event) {
    return { ok: false, code: "EVENT_TYPE_REQUIRED" };
  }

  const tenantId = await findTenantIdForPayload(input.admin, input.payload);

  const { error: insertErr } = await input.admin
    .from("billing_provider_events")
    .insert({
      provider: "asaas",
      event_id: eventId.slice(0, 200),
      tenant_id: tenantId,
      event_type: event,
      payload_summary: sanitizeAsaasSummary(input.payload),
    });

  if (insertErr) {
    if (insertErr.code === "23505") {
      const eventIdHash = createHash("sha256")
        .update(eventId)
        .digest("hex")
        .slice(0, 12);
      logger.info("billing.webhook.duplicate", {
        requestId: input.requestId,
        eventIdHash,
      });
      logBilling(BILLING_EVENTS.webhookDuplicate, {
        requestId: input.requestId,
        eventIdHash,
        operation: "webhook",
      });
      return { ok: true, duplicate: true };
    }
    throw insertErr;
  }

  logger.info("billing.webhook.received", {
    requestId: input.requestId,
    event,
    hasTenant: Boolean(tenantId),
  });
  logBilling(BILLING_EVENTS.webhookReceived, {
    requestId: input.requestId,
    tenantId: tenantId ?? undefined,
    operation: "webhook",
    providerStatus: input.payload.payment?.status ?? null,
  });

  // Atualiza status da última cobrança no checkout (não promove active sozinho).
  if (tenantId && input.payload.payment?.status) {
    await syncLatestCheckoutPaymentStatus({
      admin: input.admin,
      tenantId,
      paymentStatus: String(input.payload.payment.status),
      event,
      requestId: input.requestId,
    });
  }

  const mapped = mapAsaasEventToInternalStatus({
    event,
    subscriptionStatus: input.payload.subscription?.status,
    paymentStatus: input.payload.payment?.status,
  });

  if (mapped === "ignore") {
    return { ok: true, ignored: true, statusApplied: null };
  }

  if (mapped === "unknown") {
    logger.warn("billing.webhook.unknown_event", {
      requestId: input.requestId,
      event,
    });
    return { ok: true, unknown: true, statusApplied: null };
  }

  if (!tenantId) {
    logger.warn("billing.webhook.tenant_unresolved", {
      requestId: input.requestId,
      event,
    });
    return { ok: true, ignored: true, statusApplied: null };
  }

  const subId =
    input.payload.subscription?.id ||
    (typeof input.payload.payment?.subscription === "string"
      ? input.payload.payment.subscription
      : null);
  const customerId =
    input.payload.subscription?.customer ||
    input.payload.payment?.customer ||
    null;

  // Segurança: se payload traz subscription/customer, devem bater com o registro do tenant
  const { data: current } = await input.admin
    .from("billing_subscriptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!current) {
    logger.warn("billing.webhook.no_local_subscription", {
      requestId: input.requestId,
      tenantId,
    });
    return { ok: true, ignored: true, statusApplied: null };
  }

  const currentStatus = current.status as BillingSubscriptionStatus;
  const decision = decideWebhookApply({
    alreadyPersisted: false,
    mapped,
    current: currentStatus,
  });
  if (decision === "regression_blocked" || decision === "ignore") {
    logger.info("billing.webhook.status_regression_blocked", {
      requestId: input.requestId,
      tenantId,
      current: currentStatus,
      ignored: mapped,
      event,
    });
    return { ok: true, ignored: true, statusApplied: null };
  }

  if (
    subId &&
    current.provider_subscription_id &&
    current.provider_subscription_id !== subId
  ) {
    logger.warn("billing.webhook.subscription_mismatch", {
      requestId: input.requestId,
      tenantId,
    });
    return { ok: false, code: "SUBSCRIPTION_MISMATCH" };
  }

  if (
    customerId &&
    current.provider_customer_id &&
    current.provider_customer_id !== customerId
  ) {
    logger.warn("billing.webhook.customer_mismatch", {
      requestId: input.requestId,
      tenantId,
    });
    return { ok: false, code: "CUSTOMER_MISMATCH" };
  }

  const patch: {
    status: BillingSubscriptionStatus;
    provider: string;
    updated_at: string;
    provider_subscription_id?: string;
    provider_customer_id?: string;
    current_period_end?: string;
  } = {
    status: mapped,
    provider: "asaas",
    updated_at: new Date().toISOString(),
  };
  if (subId && !current.provider_subscription_id) {
    patch.provider_subscription_id = subId;
  }
  if (customerId && !current.provider_customer_id) {
    patch.provider_customer_id = customerId;
  }
  if (input.payload.subscription?.nextDueDate) {
    patch.current_period_end = `${input.payload.subscription.nextDueDate}T23:59:59.000Z`;
  }

  const { error: updErr } = await input.admin
    .from("billing_subscriptions")
    .update(patch)
    .eq("tenant_id", tenantId);
  if (updErr) throw updErr;

  logger.info("billing.subscription.updated", {
    requestId: input.requestId,
    tenantId,
    status: mapped,
    event,
  });
  logBilling(BILLING_EVENTS.billingStateChanged, {
    requestId: input.requestId,
    tenantId,
    operation: "subscription_status",
    providerStatus: mapped,
    subscriptionId: current.id,
    customerId: current.provider_customer_id,
  });

  return { ok: true, statusApplied: mapped };
}

async function syncLatestCheckoutPaymentStatus(input: {
  admin: Admin;
  tenantId: string;
  paymentStatus: string;
  event: string;
  requestId: string;
}) {
  const { data: latest } = await input.admin
    .from("billing_checkout_attempts")
    .select("id, status, result_summary")
    .eq("tenant_id", input.tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest || latest.status !== "completed") return;

  const summary =
    latest.result_summary && typeof latest.result_summary === "object"
      ? (latest.result_summary as Record<string, unknown>)
      : {};
  const prevHint =
    summary.paymentHint && typeof summary.paymentHint === "object"
      ? (summary.paymentHint as Record<string, unknown>)
      : null;
  if (!prevHint) return;

  const currentPay = typeof prevHint.providerStatus === "string"
    ? prevHint.providerStatus
    : null;
  if (!canApplyPaymentStatus(currentPay, input.paymentStatus)) {
    logger.info("billing.webhook.payment_status_regression_blocked", {
      requestId: input.requestId,
      tenantId: input.tenantId,
    });
    return;
  }

  const { error } = await input.admin
    .from("billing_checkout_attempts")
    .update({
      result_summary: {
        ...summary,
        paymentHint: {
          ...prevHint,
          providerStatus: input.paymentStatus.toUpperCase(),
        },
        lastWebhookEvent: input.event,
        lastWebhookPaymentStatus: input.paymentStatus.toUpperCase(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", latest.id)
    .eq("tenant_id", input.tenantId);

  if (error) {
    logger.warn("billing.webhook.checkout_status_sync_failed", {
      requestId: input.requestId,
      tenantId: input.tenantId,
    });
    return;
  }
  logger.info("billing.webhook.checkout_status_synced", {
    requestId: input.requestId,
    tenantId: input.tenantId,
    paymentStatus: input.paymentStatus.toUpperCase(),
  });
}
