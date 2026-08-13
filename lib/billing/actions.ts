"use server";

import { revalidatePath } from "next/cache";

import {
  BILLING_ERROR_CODES,
  BillingError,
  canManageBilling,
  requireBillingPageAuth,
} from "@/lib/billing/auth";
import {
  ensureAsaasCustomer,
  ensureAsaasSubscription,
  cancelAsaasSubscription,
  listSubscriptionPayments,
  pickPaymentForBillingType,
  fetchPaymentPixQrCode,
  tokenizeAsaasCreditCard,
  AsaasApiError,
} from "@/lib/billing/asaas";
import type { AsaasBillingType } from "@/lib/billing/asaas/types";
import {
  getConfiguredBillingProvider,
  isAsaasCheckoutEnabled,
  isAsaasConfigured,
  isAsaasSandbox,
  isBillingProviderConfigured,
  isRealChargesAuthorized,
  listMissingAsaasCredentials,
} from "@/lib/billing/config";
import {
  isPlanSlugAuthorized,
  rejectClientPriceFields,
  resolveCheckoutAmount,
} from "@/lib/billing/checkout-amount";
import { classifyPlanChange } from "@/lib/billing/plan-change";
import {
  buildPaymentHint,
  type PaymentHint,
} from "@/lib/billing/payment-hint";
import {
  assertClientHttps,
  resolveClientRemoteIp,
} from "@/lib/billing/remote-ip";
import {
  getPlanBySlug,
  getSubscriptionForTenant,
  getSubscriptionWithPlan,
  linkProviderSubscription,
  markSubscriptionCanceled,
  recordCheckoutAttempt,
  startPilotTrial,
  updateCheckoutAttempt,
} from "@/lib/billing/repository";
import { PILOT_PLAN_SLUG } from "@/lib/billing/types";
import { logger } from "@/lib/observability/logger";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export type BillingActionResult =
  | {
      ok: true;
      message: string;
      paymentHint?: PaymentHint;
    }
  | { ok: false; code: string; message: string };

export type CardCheckoutFields = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  holderInfoName: string;
  holderEmail: string;
  holderCpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone: string;
  mobilePhone?: string;
};

export async function startPilotTrialAction(
  tenantSlug: string,
): Promise<BillingActionResult> {
  try {
    const auth = await requireBillingPageAuth(tenantSlug);
    if (!auth.canManage) {
      return {
        ok: false,
        code: BILLING_ERROR_CODES.PERMISSION_DENIED,
        message: "Apenas o OWNER pode iniciar o trial desta empresa.",
      };
    }

    const supabase = await createClient();
    const result = await startPilotTrial({
      client: supabase,
      tenantId: auth.tenant.id,
    });

    if (!result.ok) {
      return { ok: false, code: result.code, message: result.message };
    }

    logger.info("billing_pilot_trial_started", {
      tenantId: auth.tenant.id,
      trialEnd: result.subscription.trialEnd,
    });

    revalidatePath(`/${tenantSlug}/configuracoes/assinatura`);
    return {
      ok: true,
      message: `Trial piloto ativo até ${result.subscription.trialEnd?.slice(0, 10) ?? "—"}.`,
    };
  } catch (err) {
    if (err instanceof BillingError) {
      return { ok: false, code: err.code, message: err.message };
    }
    logger.exception("billing_pilot_trial_failed", err, { tenantSlug });
    return {
      ok: false,
      code: "BILLING_TRIAL_FAILED",
      message: "Não foi possível iniciar o trial. Tente novamente.",
    };
  }
}

function normalizeBillingType(raw: string | undefined): AsaasBillingType | null {
  const t = (raw || "PIX").toUpperCase();
  if (t === "PIX" || t === "BOLETO") return t;
  if (t === "CREDIT_CARD" || t === "CARTAO" || t === "CARD") return "CREDIT_CARD";
  return null;
}

function parseStoredHint(summary: unknown): PaymentHint | undefined {
  if (!summary || typeof summary !== "object") return undefined;
  const s = summary as { paymentHint?: PaymentHint };
  return s.paymentHint ?? undefined;
}

/**
 * Checkout Asaas sandbox (opt-in). Frontend NUNCA marca paid/active.
 * Idempotente por (tenant, idempotencyKey).
 *
 * Cartão: tokeniza primeiro (POST /v3/creditCard/tokenizeCreditCard),
 * depois cria/atualiza assinatura com creditCardToken + remoteIp.
 * Nunca persiste PAN/CVV.
 */
export async function requestCheckoutAction(input: {
  tenantSlug: string;
  planSlug?: string;
  idempotencyKey: string;
  billingType?: string;
  customerEmail?: string;
  customerDocument?: string;
  customerPhone?: string;
  card?: CardCheckoutFields;
}): Promise<BillingActionResult> {
  const requestId = crypto.randomUUID();
  try {
    const auth = await requireBillingPageAuth(input.tenantSlug);
    if (!auth.canManage) {
      return {
        ok: false,
        code: BILLING_ERROR_CODES.PERMISSION_DENIED,
        message: "Apenas o OWNER pode iniciar checkout desta empresa.",
      };
    }

    const key = input.idempotencyKey.trim();
    if (!key || key.length < 8 || key.length > 128) {
      return {
        ok: false,
        code: "BILLING_IDEMPOTENCY_INVALID",
        message: "Chave de idempotência inválida.",
      };
    }

    const priceReject = rejectClientPriceFields(
      input as unknown as Record<string, unknown>,
    );
    if (priceReject) {
      return {
        ok: false,
        code: "PRICE_NOT_CLIENT_SETTABLE",
        message: priceReject,
      };
    }

    const billingType = normalizeBillingType(input.billingType);
    if (!billingType) {
      return {
        ok: false,
        code: "BILLING_TYPE_INVALID",
        message: "Método inválido. Use PIX, BOLETO ou CREDIT_CARD.",
      };
    }

    if (billingType === "CREDIT_CARD") {
      const cardErr = validateCardFields(input.card);
      if (cardErr) {
        return { ok: false, code: "CARD_FIELDS_INVALID", message: cardErr };
      }
    }

    const requestedPlanSlug = (input.planSlug || PILOT_PLAN_SLUG).trim();
    const provider = getConfiguredBillingProvider();
    const supabase = await createClient();
    const existingSub = await getSubscriptionForTenant(supabase, auth.tenant.id);
    const tenantPlan = existingSub
      ? (await getSubscriptionWithPlan(supabase, auth.tenant.id)).plan
      : null;
    if (
      !isPlanSlugAuthorized({
        requestedSlug: requestedPlanSlug,
        tenantPlanSlug: tenantPlan?.slug ?? null,
      })
    ) {
      return {
        ok: false,
        code: "PLAN_NOT_AUTHORIZED",
        message: "Plano não autorizado para este tenant.",
      };
    }
    const planSlug = requestedPlanSlug;

    logger.info("billing.checkout.started", {
      requestId,
      tenantId: auth.tenant.id,
      provider,
      billingType,
      sandbox: isAsaasSandbox(),
      realCharges: isRealChargesAuthorized(),
      planSlug,
    });

    const { attempt, created } = await recordCheckoutAttempt({
      client: supabase,
      tenantId: auth.tenant.id,
      idempotencyKey: key,
      planSlug,
      createdBy: auth.profile.id,
      provider,
    });

    if (!created) {
      return {
        ok: true,
        message: `Checkout já registrado (${attempt.status}). Sem nova cobrança.`,
        paymentHint: parseStoredHint(attempt.result_summary),
      };
    }

    if (!isBillingProviderConfigured() || !isAsaasConfigured()) {
      const missing = listMissingAsaasCredentials();
      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "provider_missing",
        result_summary: {
          reason: "PROVIDER_NOT_CONFIGURED",
          provider,
          missing,
          requestedBillingType: billingType,
        },
      });
      logger.info("billing.checkout.failed", {
        requestId,
        reason: "PROVIDER_NOT_CONFIGURED",
      });
      return {
        ok: false,
        code: BILLING_ERROR_CODES.PROVIDER_MISSING,
        message: `Asaas sandbox não configurado. Falta: ${missing.join(", ")}`,
      };
    }

    if (!isAsaasCheckoutEnabled()) {
      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "ready",
        result_summary: {
          reason: "CHECKOUT_OPT_IN_REQUIRED",
          note: "Defina BILLING_ASAAS_CHECKOUT_ENABLED=1 no servidor (sandbox).",
          missing: listMissingAsaasCredentials(),
          requestedBillingType: billingType,
        },
      });
      return {
        ok: false,
        code: "BILLING_CHECKOUT_OPT_IN_REQUIRED",
        message:
          "Credenciais Asaas detectáveis, mas checkout opt-in desligado (BILLING_ASAAS_CHECKOUT_ENABLED).",
      };
    }

    const plan = await getPlanBySlug(supabase, planSlug);
    if (!plan) {
      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "failed",
        result_summary: {
          reason: "PLAN_MISSING",
          requestedBillingType: billingType,
        },
      });
      return { ok: false, code: "PLAN_MISSING", message: "Plano não encontrado." };
    }
    if (plan.status !== "active") {
      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "failed",
        result_summary: {
          reason: "PLAN_INACTIVE",
          requestedBillingType: billingType,
          planSlug,
        },
      });
      return {
        ok: false,
        code: "PLAN_INACTIVE",
        message: "Plano inativo não pode ser usado no checkout.",
      };
    }

    const priced = resolveCheckoutAmount(plan);
    if (!priced.ok) {
      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "failed",
        result_summary: {
          reason: priced.code,
          requestedBillingType: billingType,
        },
      });
      return { ok: false, code: priced.code, message: priced.message };
    }
    const valueReais = priced.valueReais;
    if (!isAsaasSandbox() && !isRealChargesAuthorized()) {
      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "failed",
        result_summary: {
          reason: "REAL_CHARGES_BLOCKED",
          requestedBillingType: billingType,
        },
      });
      return {
        ok: false,
        code: "REAL_CHARGES_BLOCKED",
        message: "Cobrança real não autorizada (BILLING_REAL_CHARGES_ENABLED).",
      };
    }

    const email =
      input.customerEmail?.trim() ||
      input.card?.holderEmail?.trim() ||
      auth.profile.email?.trim() ||
      "";
    const document = (
      input.customerDocument ||
      input.card?.holderCpfCnpj ||
      ""
    ).replace(/\D/g, "");
    if (!email || !document || document.length < 11) {
      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "failed",
        result_summary: {
          reason: "CUSTOMER_DATA_REQUIRED",
          requestedBillingType: billingType,
        },
      });
      return {
        ok: false,
        code: "CUSTOMER_DATA_REQUIRED",
        message:
          "Informe e-mail de cobrança e CPF/CNPJ da empresa para o customer Asaas.",
      };
    }

    let sub = await getSubscriptionForTenant(supabase, auth.tenant.id);
    if (!sub) {
      const trial = await startPilotTrial({
        client: supabase,
        tenantId: auth.tenant.id,
      });
      if (!trial.ok) {
        await updateCheckoutAttempt(supabase, attempt.id, {
          status: "failed",
          result_summary: {
            reason: trial.code,
            requestedBillingType: billingType,
          },
        });
        return { ok: false, code: trial.code, message: trial.message };
      }
      sub = trial.subscription;
    }

    try {
      const { customer } = await ensureAsaasCustomer({
        requestId,
        customer: {
          name: auth.tenant.name,
          email,
          cpfCnpj: document,
          phone: input.customerPhone || input.card?.phone,
          externalReference: auth.tenant.id,
        },
      });

      // Isolamento: se o provider devolver externalReference, deve bater com o tenant.
      if (
        customer.externalReference &&
        customer.externalReference !== auth.tenant.id
      ) {
        throw new Error(
          "CUSTOMER_TENANT_MISMATCH: customer Asaas não pertence a este tenant.",
        );
      }

      let creditCardToken: string | undefined;
      let remoteIp: string | undefined;
      let cardMeta: {
        brand: string | null;
        last4: string | null;
      } | null = null;

      if (billingType === "CREDIT_CARD" && input.card) {
        if (!isAsaasSandbox()) {
          await assertClientHttps();
        }
        remoteIp = await resolveClientRemoteIp();
        const tokenized = await tokenizeAsaasCreditCard({
          requestId,
          tenantId: auth.tenant.id,
          customerId: customer.id,
          remoteIp,
          creditCard: {
            holderName: input.card.holderName,
            number: input.card.number,
            expiryMonth: input.card.expiryMonth,
            expiryYear: input.card.expiryYear,
            ccv: input.card.ccv,
          },
          creditCardHolderInfo: {
            name: input.card.holderInfoName || input.card.holderName,
            email: input.card.holderEmail || email,
            cpfCnpj: input.card.holderCpfCnpj || document,
            postalCode: input.card.postalCode,
            addressNumber: input.card.addressNumber,
            addressComplement: input.card.addressComplement,
            phone: input.card.phone,
            mobilePhone: input.card.mobilePhone,
          },
        });
        creditCardToken = tokenized.creditCardToken;
        cardMeta = {
          brand: tokenized.creditCardBrand,
          last4: tokenized.creditCardNumberLast4,
        };
        // Nunca gravar PAN/CVV — apenas token em memória até criar a assinatura.
      }

      const { subscription: asaasSub, created: subCreated } =
        await ensureAsaasSubscription({
          requestId,
          customerId: customer.id,
          tenantId: auth.tenant.id,
          value: valueReais,
          billingType,
          description: `${plan.name} — ${auth.tenant.name}`,
          creditCardToken,
          remoteIp,
        });

      await linkProviderSubscription({
        client: supabase,
        tenantId: auth.tenant.id,
        providerCustomerId: customer.id,
        providerSubscriptionId: asaasSub.id,
        currentPeriodEnd: asaasSub.nextDueDate
          ? `${asaasSub.nextDueDate}T23:59:59.000Z`
          : null,
      });

      // dueDate da cobrança atual ≠ nextDueDate da assinatura (próxima renovação).
      let paymentHint = buildPaymentHint({
        requested: billingType,
        providerBillingType: asaasSub.billingType,
        dueDate: null,
        value: valueReais,
        providerStatus: null,
      });

      try {
        const pays = await listSubscriptionPayments({
          subscriptionId: asaasSub.id,
          requestId,
        });
        const matched = pickPaymentForBillingType(pays.data, billingType);
        if (matched) {
          let pixQr: string | null = null;
          let pixPayload: string | null = null;
          if (billingType === "PIX" && matched.id) {
            try {
              const qr = await fetchPaymentPixQrCode({
                paymentId: matched.id,
                requestId,
              });
              pixQr = qr.encodedImage;
              pixPayload = qr.payload;
            } catch {
              /* QR opcional */
            }
          }
          paymentHint = buildPaymentHint({
            requested: billingType,
            providerBillingType: matched.billingType || asaasSub.billingType,
            invoiceUrl: matched.invoiceUrl,
            bankSlipUrl: matched.bankSlipUrl,
            pixQrCodeImage: pixQr,
            pixCopiaECola: pixPayload,
            dueDate: matched.dueDate ?? null,
            value: matched.value ?? valueReais,
            providerStatus: matched.status ?? null,
          });
        }
      } catch {
        /* payment list opcional */
      }

      if (paymentHint.divergence) {
        await updateCheckoutAttempt(supabase, attempt.id, {
          status: "failed",
          result_summary: {
            reason: "BILLING_TYPE_DIVERGENCE",
            requestedBillingType: billingType,
            providerBillingType: paymentHint.providerBillingType,
            paymentHint,
          },
        });
        return {
          ok: false,
          code: "BILLING_TYPE_DIVERGENCE",
          message: `Método solicitado (${billingType}) diverge do provedor (${paymentHint.providerBillingType}). Não mascaramos o método.`,
        };
      }

      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "completed",
        result_summary: {
          asaasCustomerId: customer.id,
          asaasSubscriptionId: asaasSub.id,
          requestedBillingType: billingType,
          providerBillingType: asaasSub.billingType,
          billingType,
          subCreated,
          sandbox: isAsaasSandbox(),
          amountSource: priced.source,
          amountCents: priced.amountCents,
          note: "Assinatura criada no Asaas; status active só via webhook de pagamento.",
          paymentHint,
          // Somente metadados seguros do cartão (sem token longo se não necessário reuso imediato)
          cardMeta: cardMeta
            ? { brand: cardMeta.brand, last4: cardMeta.last4 }
            : undefined,
        },
      });

      revalidatePath(`/${input.tenantSlug}/configuracoes/assinatura`);
      return {
        ok: true,
        message: subCreated
          ? `Assinatura Asaas (${billingType}) criada no sandbox. Aguardando pagamento/webhook — status interno não foi marcado active pelo frontend.`
          : `Assinatura Asaas alinhada a ${billingType} (idempotente / atualizada).`,
        paymentHint,
      };
    } catch (err) {
      const raw =
        err instanceof AsaasApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Falha Asaas";
      const isCard =
        billingType === "CREDIT_CARD" ||
        /cart[aã]o|credit.?card|recus|negad|token/i.test(raw);
      const msg = isCard
        ? "Não foi possível processar o cartão. Verifique os dados ou use outro método. Nenhum status active foi alterado."
        : raw.slice(0, 200);
      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "failed",
        result_summary: {
          reason: "ASAAS_ERROR",
          message: msg.slice(0, 200),
          requestedBillingType: billingType,
        },
      });
      logger.info("billing.checkout.failed", {
        requestId,
        billingType,
        message: msg.slice(0, 120),
      });
      return { ok: false, code: "ASAAS_CHECKOUT_FAILED", message: msg };
    }
  } catch (err) {
    if (err instanceof BillingError) {
      return { ok: false, code: err.code, message: err.message };
    }
    logger.exception("billing_checkout_failed", err, {
      tenantSlug: input.tenantSlug,
    });
    return {
      ok: false,
      code: "BILLING_CHECKOUT_FAILED",
      message: "Falha ao registrar checkout.",
    };
  }
}

function validateCardFields(card: CardCheckoutFields | undefined): string | null {
  if (!card) return "Preencha os dados do cartão.";
  const number = card.number.replace(/\s/g, "");
  if (!card.holderName.trim()) return "Informe o nome impresso no cartão.";
  if (!/^\d{13,19}$/.test(number)) return "Número do cartão inválido.";
  if (!/^\d{1,2}$/.test(card.expiryMonth.trim())) return "Mês de validade inválido.";
  if (!/^\d{4}$/.test(card.expiryYear.trim())) return "Ano de validade inválido (AAAA).";
  if (!/^\d{3,4}$/.test(card.ccv.trim())) return "CVV inválido.";
  if (!card.holderInfoName.trim() && !card.holderName.trim()) {
    return "Informe o nome do titular.";
  }
  if (!card.holderEmail.trim() && !card.phone.trim()) {
    /* email pode vir do campo cobrança */
  }
  if (!card.postalCode.replace(/\D/g, "") || card.postalCode.replace(/\D/g, "").length < 8) {
    return "CEP do titular inválido.";
  }
  if (!card.addressNumber.trim()) return "Número do endereço do titular obrigatório.";
  if (!card.phone.replace(/\D/g, "") || card.phone.replace(/\D/g, "").length < 10) {
    return "Telefone do titular inválido.";
  }
  if (
    !card.holderCpfCnpj.replace(/\D/g, "") ||
    card.holderCpfCnpj.replace(/\D/g, "").length < 11
  ) {
    return "CPF/CNPJ do titular inválido.";
  }
  return null;
}

export async function cancelSubscriptionAction(
  tenantSlug: string,
): Promise<BillingActionResult> {
  const requestId = crypto.randomUUID();
  try {
    const auth = await requireBillingPageAuth(tenantSlug);
    if (!auth.canManage) {
      return {
        ok: false,
        code: BILLING_ERROR_CODES.PERMISSION_DENIED,
        message: "Apenas o OWNER pode cancelar a assinatura.",
      };
    }

    const supabase = await createClient();
    const sub = await getSubscriptionForTenant(supabase, auth.tenant.id);
    if (!sub) {
      return {
        ok: false,
        code: "NO_SUBSCRIPTION",
        message: "Nenhuma assinatura neste tenant.",
      };
    }
    if (sub.status === "canceled") {
      return { ok: true, message: "Assinatura já estava cancelada (idempotente)." };
    }

    if (sub.provider === "asaas" && sub.providerSubscriptionId) {
      if (!isAsaasConfigured()) {
        return {
          ok: false,
          code: BILLING_ERROR_CODES.PROVIDER_MISSING,
          message: "Asaas não configurado para cancelar no provedor.",
        };
      }
      try {
        await cancelAsaasSubscription({
          subscriptionId: sub.providerSubscriptionId,
          requestId,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao cancelar no Asaas";
        if (!/not found|não encontrad|404/i.test(msg)) {
          return { ok: false, code: "ASAAS_CANCEL_FAILED", message: msg };
        }
      }
    }

    await markSubscriptionCanceled({
      client: supabase,
      tenantId: auth.tenant.id,
    });

    logger.info("billing.subscription.canceled", {
      requestId,
      tenantId: auth.tenant.id,
    });

    revalidatePath(`/${tenantSlug}/configuracoes/assinatura`);
    return {
      ok: true,
      message:
        "Assinatura cancelada. Dados da empresa e histórico foram preservados.",
    };
  } catch (err) {
    if (err instanceof BillingError) {
      return { ok: false, code: err.code, message: err.message };
    }
    logger.exception("billing_cancel_failed", err, { tenantSlug });
    return {
      ok: false,
      code: "BILLING_CANCEL_FAILED",
      message: "Falha ao cancelar assinatura.",
    };
  }
}

/**
 * Upgrade/downgrade: registra intenção sem cobrar e sem apagar dados.
 */
export async function requestPlanChangeAction(input: {
  tenantSlug: string;
  targetPlanSlug: string;
}): Promise<BillingActionResult> {
  try {
    const auth = await requireBillingPageAuth(input.tenantSlug);
    if (!auth.canManage) {
      return {
        ok: false,
        code: BILLING_ERROR_CODES.PERMISSION_DENIED,
        message: "Apenas o OWNER pode solicitar troca de plano.",
      };
    }
    const supabase = await createClient();
    const { plan } = await getSubscriptionWithPlan(supabase, auth.tenant.id);
    const decision = classifyPlanChange(
      plan?.slug || "pilot",
      input.targetPlanSlug,
    );
    logger.info("billing.plan_change.requested", {
      tenantId: auth.tenant.id,
      kind: decision.kind,
      from: decision.from,
      to: decision.to,
      charges: false,
    });
    if (!decision.allowed) {
      return { ok: false, code: "PLAN_CHANGE_NOT_ALLOWED", message: decision.message };
    }
    return {
      ok: true,
      message: decision.message,
    };
  } catch (err) {
    if (err instanceof BillingError) {
      return { ok: false, code: err.code, message: err.message };
    }
    return {
      ok: false,
      code: "PLAN_CHANGE_FAILED",
      message: "Não foi possível registrar a troca de plano.",
    };
  }
}

export async function assertOwnerBilling(tenantSlug: string) {
  const tenant = await requireTenant(tenantSlug);
  if (!canManageBilling(tenant.role)) {
    throw new BillingError(
      "Somente OWNER gerencia assinatura.",
      BILLING_ERROR_CODES.PERMISSION_DENIED,
    );
  }
  return tenant;
}
