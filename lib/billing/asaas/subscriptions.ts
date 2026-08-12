import "server-only";

import { asaasRequest } from "@/lib/billing/asaas/client";
import type {
  AsaasBillingType,
  AsaasSubscription,
} from "@/lib/billing/asaas/types";
import { logger } from "@/lib/observability/logger";

type ListResponse = {
  data?: AsaasSubscription[];
};

/**
 * Cria assinatura recorrente no Asaas (sandbox/production conforme config).
 * Idempotente por externalReference = tenant_id quando já existe ACTIVE.
 */
export async function ensureAsaasSubscription(input: {
  customerId: string;
  tenantId: string;
  value: number;
  billingType: AsaasBillingType;
  cycle?: "MONTHLY" | "YEARLY";
  nextDueDate?: string; // YYYY-MM-DD
  description?: string;
  requestId?: string;
}): Promise<{ subscription: AsaasSubscription; created: boolean }> {
  if (input.billingType === "CREDIT_CARD") {
    throw new Error(
      "CREDIT_CARD exige tokenização Asaas; formulário inseguro não é suportado.",
    );
  }

  const listed = await asaasRequest<ListResponse>({
    method: "GET",
    path: `/v3/subscriptions?customer=${encodeURIComponent(input.customerId)}&externalReference=${encodeURIComponent(input.tenantId)}&limit=5`,
    requestId: input.requestId,
  });

  const active = (listed.data ?? []).find(
    (s) =>
      s.externalReference === input.tenantId &&
      !s.deleted &&
      String(s.status).toUpperCase() === "ACTIVE",
  );
  if (active?.id) {
    logger.info("billing.subscription.reused", {
      requestId: input.requestId,
      subscriptionId: active.id,
      tenantId: input.tenantId,
    });
    return { subscription: active, created: false };
  }

  const nextDue =
    input.nextDueDate ||
    new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const created = await asaasRequest<AsaasSubscription>({
    method: "POST",
    path: "/v3/subscriptions",
    requestId: input.requestId,
    body: {
      customer: input.customerId,
      billingType: input.billingType,
      value: input.value,
      nextDueDate: nextDue,
      cycle: input.cycle ?? "MONTHLY",
      description: input.description || "Gestão no Foco — assinatura",
      externalReference: input.tenantId,
    },
  });

  logger.info("billing.subscription.created", {
    requestId: input.requestId,
    subscriptionId: created.id,
    tenantId: input.tenantId,
    billingType: input.billingType,
  });

  return { subscription: created, created: true };
}

export async function cancelAsaasSubscription(input: {
  subscriptionId: string;
  requestId?: string;
}): Promise<{ ok: boolean }> {
  await asaasRequest<unknown>({
    method: "DELETE",
    path: `/v3/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
    requestId: input.requestId,
  });
  logger.info("billing.subscription.canceled_provider", {
    requestId: input.requestId,
    subscriptionId: input.subscriptionId,
  });
  return { ok: true };
}

export async function listSubscriptionPayments(input: {
  subscriptionId: string;
  requestId?: string;
}) {
  return asaasRequest<{
    data?: Array<{
      id: string;
      status?: string;
      billingType?: string;
      value?: number;
      dueDate?: string;
      invoiceUrl?: string | null;
      bankSlipUrl?: string | null;
      pixTransaction?: unknown;
    }>;
  }>({
    method: "GET",
    path: `/v3/payments?subscription=${encodeURIComponent(input.subscriptionId)}&limit=5`,
    requestId: input.requestId,
  });
}
