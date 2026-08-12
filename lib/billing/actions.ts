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
  AsaasApiError,
} from "@/lib/billing/asaas";
import type { AsaasBillingType } from "@/lib/billing/asaas/types";
import {
  getConfiguredBillingProvider,
  isAsaasCheckoutEnabled,
  isAsaasConfigured,
  isAsaasSandbox,
  isBillingProviderConfigured,
  listMissingAsaasCredentials,
} from "@/lib/billing/config";
import {
  getPlanBySlug,
  getSubscriptionForTenant,
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
      paymentHint?: {
        billingType?: string;
        invoiceUrl?: string | null;
        bankSlipUrl?: string | null;
        dueDate?: string | null;
        value?: number | null;
      };
    }
  | { ok: false; code: string; message: string };

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

/**
 * Checkout Asaas sandbox (opt-in). Frontend NUNCA marca paid/active.
 * Idempotente por (tenant, idempotencyKey).
 */
export async function requestCheckoutAction(input: {
  tenantSlug: string;
  planSlug?: string;
  idempotencyKey: string;
  billingType?: string;
  customerEmail?: string;
  customerDocument?: string;
  customerPhone?: string;
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

    const billingType = normalizeBillingType(input.billingType);
    if (!billingType) {
      return {
        ok: false,
        code: "BILLING_TYPE_INVALID",
        message: "Método inválido. Use PIX ou BOLETO.",
      };
    }
    if (billingType === "CREDIT_CARD") {
      return {
        ok: false,
        code: "BILLING_CARD_NOT_SUPPORTED",
        message:
          "Cartão exige tokenização Asaas. Formulário inseguro não é suportado nesta sprint.",
      };
    }

    const planSlug = (input.planSlug || PILOT_PLAN_SLUG).trim();
    const provider = getConfiguredBillingProvider();
    const supabase = await createClient();

    logger.info("billing.checkout.started", {
      requestId,
      tenantId: auth.tenant.id,
      provider,
      billingType,
      sandbox: isAsaasSandbox(),
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
        result_summary: { reason: "PLAN_MISSING" },
      });
      return { ok: false, code: "PLAN_MISSING", message: "Plano não encontrado." };
    }

    // Pilot plan may have null price — sandbox requires value > 0
    const valueReais =
      plan.amountCents != null && plan.amountCents > 0
        ? plan.amountCents / 100
        : Number(process.env.BILLING_SANDBOX_AMOUNT || "19.9");

    const email =
      input.customerEmail?.trim() || auth.profile.email?.trim() || "";
    const document = (input.customerDocument || "").replace(/\D/g, "");
    if (!email || !document || document.length < 11) {
      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "failed",
        result_summary: { reason: "CUSTOMER_DATA_REQUIRED" },
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
          result_summary: { reason: trial.code },
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
          phone: input.customerPhone,
          externalReference: auth.tenant.id,
        },
      });

      const { subscription: asaasSub, created: subCreated } =
        await ensureAsaasSubscription({
          requestId,
          customerId: customer.id,
          tenantId: auth.tenant.id,
          value: valueReais,
          billingType,
          description: `${plan.name} — ${auth.tenant.name}`,
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

      let paymentHint: {
        billingType?: string;
        invoiceUrl?: string | null;
        bankSlipUrl?: string | null;
        dueDate?: string | null;
        value?: number | null;
      } = {
        billingType,
        dueDate: asaasSub.nextDueDate ?? null,
        value: valueReais,
        invoiceUrl: null,
        bankSlipUrl: null,
      };

      try {
        const pays = await listSubscriptionPayments({
          subscriptionId: asaasSub.id,
          requestId,
        });
        const first = pays.data?.[0];
        if (first) {
          paymentHint = {
            billingType: first.billingType || billingType,
            dueDate: first.dueDate ?? asaasSub.nextDueDate ?? null,
            value: first.value ?? valueReais,
            invoiceUrl: first.invoiceUrl ?? null,
            bankSlipUrl: first.bankSlipUrl ?? null,
          };
        }
      } catch {
        /* payment list opcional */
      }

      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "completed",
        result_summary: {
          asaasCustomerId: customer.id,
          asaasSubscriptionId: asaasSub.id,
          billingType,
          subCreated,
          sandbox: isAsaasSandbox(),
          note: "Assinatura criada no Asaas; status active só via webhook de pagamento.",
          paymentHint,
        },
      });

      revalidatePath(`/${input.tenantSlug}/configuracoes/assinatura`);
      return {
        ok: true,
        message: subCreated
          ? `Assinatura Asaas (${billingType}) criada no sandbox. Aguardando pagamento/webhook — status interno não foi marcado active pelo frontend.`
          : `Assinatura Asaas já existia para este tenant (idempotente).`,
        paymentHint,
      };
    } catch (err) {
      const msg =
        err instanceof AsaasApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Falha Asaas";
      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "failed",
        result_summary: { reason: "ASAAS_ERROR", message: msg.slice(0, 200) },
      });
      logger.info("billing.checkout.failed", { requestId, message: msg.slice(0, 120) });
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
        // Se já deletada, segue para marcar local
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
