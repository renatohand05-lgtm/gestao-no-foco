import "server-only";

import { asaasRequest } from "@/lib/billing/asaas/client";
import type {
  AsaasBillingType,
  AsaasSubscription,
} from "@/lib/billing/asaas/types";
import { BILLING_EVENTS, logBilling } from "@/lib/billing/observability";
import { logger } from "@/lib/observability/logger";

type ListResponse = {
  data?: AsaasSubscription[];
};

export type EnsureSubscriptionInput = {
  customerId: string;
  tenantId: string;
  value: number;
  billingType: AsaasBillingType;
  cycle?: "MONTHLY" | "YEARLY";
  nextDueDate?: string; // YYYY-MM-DD
  description?: string;
  requestId?: string;
  /** Obrigatório para CREDIT_CARD (tokenização prévia). */
  creditCardToken?: string;
  /** IP do cliente pagador — nunca IP do servidor. */
  remoteIp?: string;
};

/**
 * Cria/reusa assinatura Asaas alinhada ao billingType solicitado.
 * Não reutiliza ACTIVE com método diferente sem atualizar o provider.
 */
export async function ensureAsaasSubscription(
  input: EnsureSubscriptionInput,
): Promise<{
  subscription: AsaasSubscription;
  created: boolean;
  billingTypeAligned: boolean;
}> {
  if (input.billingType === "CREDIT_CARD") {
    if (!input.creditCardToken?.trim()) {
      throw new Error(
        "CREDIT_CARD exige creditCardToken (tokenização Asaas prévia).",
      );
    }
    if (!input.remoteIp?.trim()) {
      throw new Error("CREDIT_CARD exige remoteIp do cliente.");
    }
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
    const existingType = String(active.billingType || "").toUpperCase();
    if (existingType === input.billingType) {
      logger.info("billing.subscription.reused", {
        requestId: input.requestId,
        subscriptionId: active.id,
        tenantId: input.tenantId,
        billingType: input.billingType,
      });
      return {
        subscription: active,
        created: false,
        billingTypeAligned: true,
      };
    }

    // Método diferente: atualiza no provider (não mascara PIX como BOLETO).
    const updated = await updateAsaasSubscriptionBilling({
      subscriptionId: active.id,
      billingType: input.billingType,
      value: input.value,
      creditCardToken: input.creditCardToken,
      remoteIp: input.remoteIp,
      requestId: input.requestId,
    });

    const aligned =
      String(updated.billingType || "").toUpperCase() === input.billingType;
    if (!aligned) {
      logger.warn("billing.subscription.billing_type_divergence", {
        requestId: input.requestId,
        subscriptionId: updated.id,
        requested: input.billingType,
        provider: updated.billingType ?? null,
        tenantId: input.tenantId,
      });
      throw new Error(
        `DIVERGENCE: solicitado ${input.billingType}, provider retornou ${updated.billingType ?? "desconhecido"}.`,
      );
    }

    logger.info("billing.subscription.billing_type_updated", {
      requestId: input.requestId,
      subscriptionId: updated.id,
      tenantId: input.tenantId,
      from: existingType,
      to: input.billingType,
    });

    return {
      subscription: updated,
      created: false,
      billingTypeAligned: true,
    };
  }

  const nextDue =
    input.nextDueDate ||
    new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.billingType,
    value: input.value,
    nextDueDate: nextDue,
    cycle: input.cycle ?? "MONTHLY",
    description: input.description || "Gestão no Foco — assinatura",
    externalReference: input.tenantId,
  };

  if (input.billingType === "CREDIT_CARD") {
    body.creditCardToken = input.creditCardToken;
    body.remoteIp = input.remoteIp;
  }

  const created = await asaasRequest<AsaasSubscription>({
    method: "POST",
    path: "/v3/subscriptions",
    requestId: input.requestId,
    body,
  });

  const aligned =
    String(created.billingType || "").toUpperCase() === input.billingType;
  if (!aligned) {
    logger.warn("billing.subscription.billing_type_divergence", {
      requestId: input.requestId,
      subscriptionId: created.id,
      requested: input.billingType,
      provider: created.billingType ?? null,
      tenantId: input.tenantId,
    });
    throw new Error(
      `DIVERGENCE: solicitado ${input.billingType}, provider retornou ${created.billingType ?? "desconhecido"}.`,
    );
  }

  logger.info("billing.subscription.created", {
    requestId: input.requestId,
    subscriptionId: created.id,
    tenantId: input.tenantId,
    billingType: input.billingType,
  });
  logBilling(BILLING_EVENTS.providerSubscriptionCreated, {
    requestId: input.requestId,
    tenantId: input.tenantId,
    subscriptionId: created.id,
    operation: "ensure_subscription",
  });

  return {
    subscription: created,
    created: true,
    billingTypeAligned: true,
  };
}

async function updateAsaasSubscriptionBilling(input: {
  subscriptionId: string;
  billingType: AsaasBillingType;
  value: number;
  creditCardToken?: string;
  remoteIp?: string;
  requestId?: string;
}): Promise<AsaasSubscription> {
  const body: Record<string, unknown> = {
    billingType: input.billingType,
    value: input.value,
    updatePendingPayments: true,
  };
  if (input.billingType === "CREDIT_CARD") {
    body.creditCardToken = input.creditCardToken;
    body.remoteIp = input.remoteIp;
  }

  return asaasRequest<AsaasSubscription>({
    method: "PUT",
    path: `/v3/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
    requestId: input.requestId,
    body,
  });
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

export type AsaasPaymentListItem = {
  id: string;
  status?: string;
  billingType?: string;
  value?: number;
  dueDate?: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  pixTransaction?: unknown;
};

export async function listSubscriptionPayments(input: {
  subscriptionId: string;
  requestId?: string;
}) {
  return asaasRequest<{
    data?: AsaasPaymentListItem[];
  }>({
    method: "GET",
    path: `/v3/payments?subscription=${encodeURIComponent(input.subscriptionId)}&limit=10`,
    requestId: input.requestId,
  });
}

/** Escolhe cobrança alinhada ao método solicitado (não misturar PIX/BOLETO). */
export function pickPaymentForBillingType(
  payments: AsaasPaymentListItem[] | undefined,
  requested: AsaasBillingType,
): AsaasPaymentListItem | null {
  const list = payments ?? [];
  const exact = list.find(
    (p) => String(p.billingType || "").toUpperCase() === requested,
  );
  return exact ?? null;
}

export async function fetchPaymentPixQrCode(input: {
  paymentId: string;
  requestId?: string;
}): Promise<{ encodedImage: string | null; payload: string | null }> {
  const res = await asaasRequest<{
    encodedImage?: string;
    payload?: string;
  }>({
    method: "GET",
    path: `/v3/payments/${encodeURIComponent(input.paymentId)}/pixQrCode`,
    requestId: input.requestId,
  });
  return {
    encodedImage: res.encodedImage ?? null,
    payload: res.payload ?? null,
  };
}
