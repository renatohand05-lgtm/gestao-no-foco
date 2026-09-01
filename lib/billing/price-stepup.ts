import "server-only";

import { getCommercialPlan } from "@/lib/billing/catalog";
import { updateAsaasSubscriptionValue } from "@/lib/billing/asaas/subscriptions";
import { isAsaasSandbox } from "@/lib/billing/config";
import { logger } from "@/lib/observability/logger";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";

type StepUpCandidate = {
  id: string;
  tenant_id: string;
  provider: string | null;
  provider_subscription_id: string | null;
  created_at: string;
  plan: { slug: string } | { slug: string }[] | null;
};

/**
 * Cron diário — sobe o valor recorrente de assinaturas com preço
 * promocional (ex: plano Início R$39,90 → R$59,90) assim que o período
 * promocional (introDurationDays) termina. Idempotente via
 * intro_price_stepped_up_at.
 */
export async function runPriceStepUpJob(now = new Date()): Promise<{
  skipped?: boolean;
  reason?: string;
  checked: number;
  steppedUp: number;
  failed: number;
}> {
  if (!isAdminClientAvailable()) {
    return {
      skipped: true,
      reason: "admin_client_unavailable",
      checked: 0,
      steppedUp: 0,
      failed: 0,
    };
  }

  const client = createAdminClient();
  const { data, error } = await client
    .from("billing_subscriptions")
    .select(
      "id, tenant_id, provider, provider_subscription_id, created_at, plan:billing_plans(slug)",
    )
    .in("status", ["active", "trial"])
    .is("intro_price_stepped_up_at", null)
    .not("provider_subscription_id", "is", null);
  if (error) throw error;

  const candidates = (data ?? []) as unknown as StepUpCandidate[];
  let steppedUp = 0;
  let failed = 0;

  for (const row of candidates) {
    const planSlug = Array.isArray(row.plan) ? row.plan[0]?.slug : row.plan?.slug;
    if (!planSlug) continue;

    const commercial = getCommercialPlan(planSlug);
    if (!commercial?.introAmountCents || !commercial.introDurationDays) continue;
    if (row.provider !== "asaas" || !row.provider_subscription_id) continue;

    const introEndsAt = new Date(
      new Date(row.created_at).getTime() +
        commercial.introDurationDays * 86_400_000,
    );
    if (now < introEndsAt) continue;

    try {
      if (!isAsaasSandbox()) {
        await updateAsaasSubscriptionValue({
          subscriptionId: row.provider_subscription_id,
          value: commercial.amountCents / 100,
        });
      }
      const { error: updateError } = await client
        .from("billing_subscriptions")
        .update({ intro_price_stepped_up_at: now.toISOString() })
        .eq("id", row.id);
      if (updateError) throw updateError;
      steppedUp += 1;
      logger.info("billing.price_stepup.applied", {
        tenantId: row.tenant_id,
        subscriptionId: row.id,
        planSlug,
        newAmountCents: commercial.amountCents,
      });
    } catch (err) {
      failed += 1;
      logger.error("billing.price_stepup.failed", {
        tenantId: row.tenant_id,
        subscriptionId: row.id,
        planSlug,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { checked: candidates.length, steppedUp, failed };
}
