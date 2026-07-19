import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import { PredictionConfidenceBadge } from "@/components/executive/predictions/prediction-confidence";
import {
  ScenarioMetric,
  formatScenarioMoney,
  formatScenarioPct,
  formatScenarioSignedMoney,
} from "@/components/executive/predictions/scenario-metric";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ScenarioCardModel } from "@/lib/predictions/types";

type Props = {
  scenario: ScenarioCardModel;
  highlighted?: boolean;
};

export function ScenarioCard({ scenario, highlighted }: Props) {
  return (
    <ExecutiveCard
      padding={20}
      accent={highlighted ? "primary" : "none"}
      className={cn(
        "h-full",
        exAnimations.slide,
        highlighted && "ring-1 ring-blue-500/30",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={exTypography.label}>Cenário</p>
        {highlighted ? (
          <ExecutiveBadge tone="primary">Recomendado</ExecutiveBadge>
        ) : null}
        <ExecutiveBadge
          tone={
            scenario.viability === "viavel"
              ? "success"
              : scenario.viability === "agressivo"
                ? "warning"
                : scenario.viability === "improvavel" ||
                    scenario.viability === "impossivel"
                  ? "danger"
                  : "info"
          }
        >
          {scenario.viabilityLabel}
        </ExecutiveBadge>
      </div>
      <p className="mt-3 text-sm font-semibold tracking-tight">{scenario.name}</p>
      <p className={cn("mt-2", exTypography.caption)}>{scenario.description}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ScenarioMetric
          label="Projeção"
          value={formatScenarioMoney(scenario.projectedRevenue)}
        />
        <ScenarioMetric
          label="Atingimento"
          value={formatScenarioPct(scenario.projectedAttainment)}
        />
        <ScenarioMetric
          label="Gap"
          value={
            scenario.projectedGap === null
              ? "—"
              : formatScenarioMoney(scenario.projectedGap)
          }
        />
        <ScenarioMetric
          label="Incremento"
          value={formatScenarioSignedMoney(scenario.estimatedIncrement)}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-center">
        <div>
          <p className={exTypography.label}>Esforço</p>
          <p className="text-sm font-semibold tabular-nums">
            {scenario.effortScore}
          </p>
        </div>
        <div>
          <p className={exTypography.label}>Impacto</p>
          <p className="text-sm font-semibold tabular-nums">
            {scenario.impactScore}
          </p>
        </div>
        <div>
          <p className={exTypography.label}>Risco</p>
          <p className="text-sm font-semibold tabular-nums">
            {scenario.riskScore}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <PredictionConfidenceBadge confidence={scenario.confidence} />
        <p className={cn("mt-1", exTypography.caption)}>
          Probabilidade {scenario.probability.label.replaceAll("_", " ")} (
          {scenario.probability.score}/100)
        </p>
      </div>
    </ExecutiveCard>
  );
}
