import { requireAuth } from "@/lib/tenants";
import { getPlatformAccess } from "@/lib/platform/platform-access-service";
import { listCommercialPlans, formatBrlFromCents } from "@/lib/billing/catalog";
import {
  CORE_ALWAYS_UNLOCKED_LABELS,
  PLAN_FEATURES,
  isFeatureUnlockedForPlan,
  type CommercialPlanSlug,
} from "@/lib/billing/plan-feature-matrix";
import { PlanPreviewClient } from "@/components/master/plan-preview-client";

export const metadata = { title: "Simulador de planos · Gestão no Foco" };

function planLabelBySlug(
  plans: ReturnType<typeof listCommercialPlans>,
  slug: string,
): string {
  return plans.find((p) => p.slug === slug)?.name ?? slug;
}

export default async function PlanPreviewPage() {
  await requireAuth();
  const access = await getPlatformAccess();

  if (!access) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Acesso restrito
        </h1>
        <p className="text-sm text-muted-foreground">
          Esta área é exclusiva do dono da plataforma e de associados
          autorizados. Sua conta não tem esse acesso.
        </p>
      </div>
    );
  }

  const plans = listCommercialPlans();

  const planPreviews = plans.map((plan) => ({
    slug: plan.slug,
    name: plan.name,
    priceLabel: plan.introAmountCents
      ? `${formatBrlFromCents(plan.introAmountCents)}/mês nos primeiros ${plan.introDurationDays} dias, depois ${formatBrlFromCents(plan.amountCents)}/mês`
      : `${formatBrlFromCents(plan.amountCents)}/mês`,
    maxSeats: plan.maxSeats,
  }));

type FeatureRow = { id: string; label: string; minPlanLabel: string; unlocked: boolean };

  const featuresByPlan: Record<string, FeatureRow[]> = {};
  for (const plan of plans) {
    featuresByPlan[plan.slug] = PLAN_FEATURES.map((feature) => ({
      id: feature.id,
      label: feature.label,
      minPlanLabel: planLabelBySlug(plans, feature.minPlanSlug),
      unlocked: isFeatureUnlockedForPlan(
        feature.id,
        plan.slug as CommercialPlanSlug,
      ),
    }));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1 border-b border-border/60 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold,#C9A84C)]">
          Painel mestre
        </p>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Simulador de planos
        </h1>
        <p className="text-sm text-muted-foreground">
          Troque de plano abaixo e veja exatamente o que cada cliente vê
          liberado ou travado.
        </p>
      </header>

      <PlanPreviewClient
        plans={planPreviews}
        coreLabels={[...CORE_ALWAYS_UNLOCKED_LABELS]}
        featuresByPlan={featuresByPlan}
      />
    </div>
  );
}
