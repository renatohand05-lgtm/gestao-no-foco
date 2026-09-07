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
 * (não simulado) — mesma regra usada no Financeiro (Fase 2), só que sem o
 * nome amarrado a "finance", pra ser reaproveitada por qualquer módulo
 * (ex.: assistente de IA). Piloto/sem plano comercial = sempre liberado.
 */
export async function isPlanFeatureUnlocked(
  client: SupabaseClient,
  tenantId: string,
  feature: PlanFeatureId,
): Promise<boolean> {
  const { plan } = await getSubscriptionWithPlan(client, tenantId);
  if (!plan?.slug) return true;
  if (!isCommercialPlanSlug(plan.slug)) return true;
  return isFeatureUnlockedForPlan(feature, plan.slug as CommercialPlanSlug);
}
