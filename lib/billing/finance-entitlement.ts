import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSubscriptionWithPlan } from "@/lib/billing/repository";
import {
  isCommercialPlanSlug,
  type CommercialPlanSlug,
} from "@/lib/billing/catalog";
import {
  isFeatureUnlockedForPlan,
  type PlanFeatureId,
} from "@/lib/billing/plan-feature-matrix";

/**
 * True quando o tenant tem um recurso liberado no plano comercial real
 * (não simulado). Piloto/sem plano comercial = sempre liberado — "não
 * bloquear piloto" é uma decisão já tomada em outras partes do catálogo.
 * Só trava de verdade quando o tenant já está num plano comercial pago
 * (start/essential/management/pro/pro_plus_consulting) que não inclui
 * aquele recurso.
 */
export async function isFinanceFeatureUnlocked(
  client: SupabaseClient,
  tenantId: string,
  feature: PlanFeatureId,
): Promise<boolean> {
  const { plan } = await getSubscriptionWithPlan(client, tenantId);
  if (!plan?.slug) return true;
  if (!isCommercialPlanSlug(plan.slug)) return true;
  return isFeatureUnlockedForPlan(feature, plan.slug as CommercialPlanSlug);
}

/** Também retorna o slug do plano real — útil pra montar o link de upgrade. */
export async function getTenantCommercialPlanSlug(
  client: SupabaseClient,
  tenantId: string,
): Promise<string | null> {
  const { plan } = await getSubscriptionWithPlan(client, tenantId);
  if (!plan?.slug || !isCommercialPlanSlug(plan.slug)) return null;
  return plan.slug;
}
