import "server-only";

import { asaasRequest, maskDocument } from "@/lib/billing/asaas/client";
import type {
  AsaasCustomer,
  AsaasCustomerInput,
} from "@/lib/billing/asaas/types";
import { logger } from "@/lib/observability/logger";

type ListResponse = {
  data?: AsaasCustomer[];
  totalCount?: number;
};

/**
 * Lookup por externalReference (= tenant_id) ou cria.
 * Idempotente: não duplica customer para o mesmo tenant.
 */
export async function ensureAsaasCustomer(input: {
  customer: AsaasCustomerInput;
  requestId?: string;
}): Promise<{ customer: AsaasCustomer; created: boolean }> {
  const ref = input.customer.externalReference.trim();
  if (!ref) {
    throw new Error("externalReference (tenant_id) obrigatório");
  }

  const listed = await asaasRequest<ListResponse>({
    method: "GET",
    path: `/v3/customers?externalReference=${encodeURIComponent(ref)}&limit=1`,
    requestId: input.requestId,
  });

  const existing = listed.data?.[0];
  if (existing?.id) {
    logger.info("billing.customer.reused", {
      requestId: input.requestId,
      customerId: existing.id,
      tenantId: ref,
    });
    return { customer: existing, created: false };
  }

  const created = await asaasRequest<AsaasCustomer>({
    method: "POST",
    path: "/v3/customers",
    requestId: input.requestId,
    body: {
      name: input.customer.name.trim(),
      email: input.customer.email.trim(),
      cpfCnpj: input.customer.cpfCnpj.replace(/\D/g, ""),
      mobilePhone: input.customer.phone?.replace(/\D/g, "") || undefined,
      externalReference: ref,
      notificationDisabled: false,
    },
  });

  logger.info("billing.customer.created", {
    requestId: input.requestId,
    customerId: created.id,
    tenantId: ref,
    doc: maskDocument(input.customer.cpfCnpj),
  });

  return { customer: created, created: true };
}
