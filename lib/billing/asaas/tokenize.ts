import "server-only";

import { asaasRequest } from "@/lib/billing/asaas/client";
import { logger } from "@/lib/observability/logger";

export type TokenizeCreditCardInput = {
  customerId: string;
  remoteIp: string;
  creditCard: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string | null;
    phone: string;
    mobilePhone?: string | null;
  };
  requestId?: string;
  /** Tenant dono do customer — só para log sanitizado. */
  tenantId: string;
};

export type TokenizeCreditCardResult = {
  creditCardToken: string;
  creditCardBrand: string | null;
  creditCardNumberLast4: string | null;
};

/**
 * Tokeniza cartão via Asaas (sandbox habilitado).
 * Nunca loga número/CVV. Token é por customer — não reutilizar cross-tenant.
 */
export async function tokenizeAsaasCreditCard(
  input: TokenizeCreditCardInput,
): Promise<TokenizeCreditCardResult> {
  if (!input.customerId.startsWith("cus_")) {
    throw new Error("customerId Asaas inválido para tokenização");
  }

  const res = await asaasRequest<{
    creditCardToken?: string;
    creditCardBrand?: string;
    creditCardNumber?: string;
  }>({
    method: "POST",
    path: "/v3/creditCard/tokenizeCreditCard",
    requestId: input.requestId,
    body: {
      customer: input.customerId,
      creditCard: {
        holderName: input.creditCard.holderName.trim(),
        number: input.creditCard.number.replace(/\s/g, ""),
        expiryMonth: input.creditCard.expiryMonth.trim(),
        expiryYear: input.creditCard.expiryYear.trim(),
        ccv: input.creditCard.ccv.trim(),
      },
      creditCardHolderInfo: {
        name: input.creditCardHolderInfo.name.trim(),
        email: input.creditCardHolderInfo.email.trim(),
        cpfCnpj: input.creditCardHolderInfo.cpfCnpj.replace(/\D/g, ""),
        postalCode: input.creditCardHolderInfo.postalCode.replace(/\D/g, ""),
        addressNumber: input.creditCardHolderInfo.addressNumber.trim(),
        addressComplement:
          input.creditCardHolderInfo.addressComplement ?? undefined,
        phone: input.creditCardHolderInfo.phone.replace(/\D/g, ""),
        mobilePhone:
          input.creditCardHolderInfo.mobilePhone?.replace(/\D/g, "") ||
          undefined,
      },
      remoteIp: input.remoteIp,
    },
  });

  if (!res.creditCardToken) {
    throw new Error("Asaas não retornou creditCardToken");
  }

  logger.info("billing.card.tokenized", {
    requestId: input.requestId,
    tenantId: input.tenantId,
    customerId: input.customerId,
    brand: res.creditCardBrand ?? null,
    last4: res.creditCardNumber ?? null,
  });

  return {
    creditCardToken: res.creditCardToken,
    creditCardBrand: res.creditCardBrand ?? null,
    creditCardNumberLast4: res.creditCardNumber ?? null,
  };
}
