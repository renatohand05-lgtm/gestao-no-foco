import "server-only";

import { cache } from "react";

import {
  getConfiguredBillingProvider,
  isBillingProviderConfigured,
} from "@/lib/billing/config";
import {
  isTrialExpired,
  resolveSubscriptionAccess,
} from "@/lib/billing/entitlements";
import { getSubscriptionWithPlan } from "@/lib/billing/repository";
import type { BillingSubscriptionView } from "@/lib/billing/types";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const BILLING_ERROR_CODES = {
  SESSION_MISSING: "BILLING_SESSION_MISSING",
  PERMISSION_DENIED: "BILLING_PERMISSION_DENIED",
  SCHEMA_MISSING: "BILLING_SCHEMA_MISSING",
  PROVIDER_MISSING: "BILLING_PROVIDER_MISSING",
} as const;

export class BillingError extends Error {
  code: (typeof BILLING_ERROR_CODES)[keyof typeof BILLING_ERROR_CODES];
  constructor(
    message: string,
    code: (typeof BILLING_ERROR_CODES)[keyof typeof BILLING_ERROR_CODES],
  ) {
    super(message);
    this.name = "BillingError";
    this.code = code;
  }
}

/** OWNER gerencia; admin pode visualizar status (sem checkout). */
export function canViewBilling(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

export function canManageBilling(role: string | null | undefined) {
  return role === "owner";
}

export const requireBillingPageAuth = cache(async (tenantSlug: string) => {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) {
    throw new BillingError(
      "Sessão ausente.",
      BILLING_ERROR_CODES.SESSION_MISSING,
    );
  }
  if (!canViewBilling(tenant.role)) {
    throw new BillingError(
      "Sem permissão para ver assinatura desta empresa.",
      BILLING_ERROR_CODES.PERMISSION_DENIED,
    );
  }
  return {
    tenant,
    profile,
    canManage: canManageBilling(tenant.role),
    provider: getConfiguredBillingProvider(),
    providerConfigured: isBillingProviderConfigured(),
  };
});

export async function loadBillingView(
  tenantId: string,
): Promise<BillingSubscriptionView> {
  const supabase = await createClient();
  try {
    const { subscription, plan } = await getSubscriptionWithPlan(
      supabase,
      tenantId,
    );
    if (!subscription) {
      const access = resolveSubscriptionAccess({
        status: null,
        trialEnd: null,
        entitlements: {},
      });
      return {
        subscription: null,
        plan: null,
        trialExpired: false,
        accessMode: access.accessMode,
        restrictionReason: access.reason,
      };
    }
    const trialExpired = isTrialExpired({
      status: subscription.status,
      trialEnd: subscription.trialEnd,
    });
    const access = resolveSubscriptionAccess({
      status: subscription.status,
      trialEnd: subscription.trialEnd,
      entitlements: plan?.entitlements ?? {},
    });
    return {
      subscription,
      plan,
      trialExpired,
      accessMode: access.accessMode,
      restrictionReason: access.reason,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/billing_subscriptions|billing_plans|schema cache|does not exist/i.test(message)) {
      throw new BillingError(
        "Schema de billing ainda não aplicado neste ambiente.",
        BILLING_ERROR_CODES.SCHEMA_MISSING,
      );
    }
    throw err;
  }
}
