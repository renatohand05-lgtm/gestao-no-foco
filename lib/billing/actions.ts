"use server";

import { revalidatePath } from "next/cache";

import {
  BILLING_ERROR_CODES,
  BillingError,
  canManageBilling,
  requireBillingPageAuth,
} from "@/lib/billing/auth";
import {
  getConfiguredBillingProvider,
  isBillingProviderConfigured,
} from "@/lib/billing/config";
import {
  recordCheckoutAttempt,
  startPilotTrial,
  updateCheckoutAttempt,
} from "@/lib/billing/repository";
import { PILOT_PLAN_SLUG } from "@/lib/billing/types";
import { logger } from "@/lib/observability/logger";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export type BillingActionResult =
  | { ok: true; message: string }
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

/**
 * Checkout server-side. Sem provedor: NÃO marca paid/active.
 * Idempotente por (tenant, idempotencyKey).
 */
export async function requestCheckoutAction(input: {
  tenantSlug: string;
  planSlug?: string;
  idempotencyKey: string;
}): Promise<BillingActionResult> {
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

    const planSlug = (input.planSlug || PILOT_PLAN_SLUG).trim();
    const provider = getConfiguredBillingProvider();
    const supabase = await createClient();

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

    if (!isBillingProviderConfigured()) {
      await updateCheckoutAttempt(supabase, attempt.id, {
        status: "provider_missing",
        result_summary: {
          reason: "PROVIDER_NOT_CONFIGURED",
          provider,
          note: "Frontend não pode marcar paid. Configure provedor + secrets no servidor.",
        },
      });
      return {
        ok: false,
        code: BILLING_ERROR_CODES.PROVIDER_MISSING,
        message:
          "Provedor de pagamento ainda não configurado. Trial piloto disponível sem cartão.",
      };
    }

    // Provedor configurado: integração real fica para autorização explícita do Renato.
    // Não criar cobrança automática nesta sprint.
    await updateCheckoutAttempt(supabase, attempt.id, {
      status: "ready",
      result_summary: {
        reason: "PROVIDER_CONFIGURED_PENDING_INTEGRATION",
        provider,
        note: "Credenciais presentes; checkout real ainda não habilitado sem autorização.",
      },
    });

    return {
      ok: false,
      code: "BILLING_CHECKOUT_NOT_ENABLED",
      message:
        "Provedor detectado, mas checkout real está desligado até autorização explícita.",
    };
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

/** Guard server: member não gerencia billing de outro/mesmo tenant. */
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
