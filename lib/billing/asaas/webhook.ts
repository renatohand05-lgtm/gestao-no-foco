import "server-only";

import { createHash } from "node:crypto";

import { mapAsaasEventToInternalStatus } from "@/lib/billing/asaas/status-map";
import type { AsaasWebhookPayload } from "@/lib/billing/asaas/types";
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
      logger.info("billing.webhook.duplicate", {
        requestId: input.requestId,
        eventIdHash: createHash("sha256")
          .update(eventId)
          .digest("hex")
          .slice(0, 12),
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

  return { ok: true, statusApplied: mapped };
}
