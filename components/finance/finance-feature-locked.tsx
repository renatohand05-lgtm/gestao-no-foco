import Link from "next/link";
import { Lock } from "lucide-react";

import { getCommercialPlan } from "@/lib/billing/catalog";
import type { PlanFeatureId } from "@/lib/billing/plan-feature-matrix";
import { PLAN_FEATURES } from "@/lib/billing/plan-feature-matrix";

type Props = {
  tenantSlug: string;
  feature: PlanFeatureId;
  title: string;
};

/** Tela mostrada no lugar do conteúdo real quando o plano não libera este recurso. */
export function FinanceFeatureLocked({ tenantSlug, feature, title }: Props) {
  const def = PLAN_FEATURES.find((f) => f.id === feature);
  const minPlan = def ? getCommercialPlan(def.minPlanSlug) : null;
  const minPlanName = minPlan?.name ?? "um plano superior";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Lock className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-foreground">
        {title} é do plano {minPlanName}
      </h2>
      <p className="text-sm text-muted-foreground">
        Seu plano atual ainda não libera este recurso. Faça upgrade pra
        desbloquear.
      </p>
      <Link
        href={`/${tenantSlug}/configuracoes/assinatura`}
        className="mt-1 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Ver planos
      </Link>
    </div>
  );
}
