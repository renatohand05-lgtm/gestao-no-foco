import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import { PredictionConfidenceBadge } from "@/components/executive/predictions/prediction-confidence";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ScenarioRecommendation } from "@/lib/predictions/types";

type Props = {
  recommendation: ScenarioRecommendation;
};

export function ScenarioRecommendationCard({ recommendation }: Props) {
  return (
    <ExecutiveCard
      padding={24}
      accent="primary"
      className={cn(exAnimations.slide)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={exTypography.label}>Melhor cenário recomendado</p>
        <ExecutiveBadge tone="primary">Destaque</ExecutiveBadge>
      </div>
      <p className="mt-3 text-lg font-semibold tracking-tight sm:text-xl">
        {recommendation.title}
      </p>
      <p className={cn("mt-2", exTypography.caption)}>
        {recommendation.rationale}
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className={exTypography.label}>Impacto esperado</dt>
          <dd className="mt-1 text-sm">{recommendation.expectedImpact}</dd>
        </div>
        <div>
          <dt className={exTypography.label}>Esforço · Risco</dt>
          <dd className="mt-1 text-sm">
            {recommendation.effort} · {recommendation.risk}
          </dd>
        </div>
      </dl>

      <div className="mt-3">
        <PredictionConfidenceBadge confidence={recommendation.confidence} />
        {recommendation.confidenceWarning ? (
          <p
            role="status"
            className={cn("mt-2 text-amber-800 dark:text-amber-200", exTypography.caption)}
          >
            {recommendation.confidenceWarning}
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <p className={exTypography.label}>Plano de ação</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          {recommendation.actionPlan.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </ExecutiveCard>
  );
}
