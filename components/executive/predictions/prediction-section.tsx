import { ExecutiveCard, ExecutiveSection } from "@/components/executive";
import { PredictionEmptyState } from "@/components/executive/predictions/prediction-empty-state";
import { PredictionSummaryCard } from "@/components/executive/predictions/prediction-summary-card";
import { ScenarioCard } from "@/components/executive/predictions/scenario-card";
import { ScenarioComparison } from "@/components/executive/predictions/scenario-comparison";
import { ScenarioRecommendationCard } from "@/components/executive/predictions/scenario-recommendation-card";
import { ScenarioSimulator } from "@/components/executive/predictions/scenario-simulator";
import {
  ScenarioMetric,
  formatScenarioMoney,
} from "@/components/executive/predictions/scenario-metric";
import { exSpacing, exStack, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
  PredictionEngineResult,
  PredictionInput,
} from "@/lib/predictions/types";

type Props = {
  data: PredictionEngineResult;
  predictionInput: PredictionInput;
};

/**
 * Seção Prediction & Scenarios (Sprint 11.3).
 * Compacta: resumo → recomendação → cards → comparador recolhível → simulador.
 */
export function PredictionSection({ data, predictionInput }: Props) {
  if (data.scenarios.length === 0) {
    return (
      <ExecutiveSection
        title="Previsão e cenários"
        description="Simulações em memória a partir dos dados já carregados."
        panel
      >
        <PredictionEmptyState />
      </ExecutiveSection>
    );
  }

  return (
    <ExecutiveSection
      title="Previsão e cenários"
      description="O que acontece se o ritmo continuar, quanto falta crescer e qual cenário equilibra ganho e esforço — sem novos fetches."
      panel
      actions={<ScenarioSimulator input={predictionInput} />}
    >
      <div className={exStack[20]}>
        <PredictionSummaryCard summary={data.summary} />

        {data.recommendation ? (
          <ScenarioRecommendationCard recommendation={data.recommendation} />
        ) : null}

        {(data.requiredForMeta.alert ||
          data.requiredForMeta.requiredDailyAverage !== null) ? (
          <div role="status">
            <ExecutiveCard
              padding={16}
              accent={
                data.requiredForMeta.viability === "impossivel" ||
                data.requiredForMeta.viability === "improvavel"
                  ? "warning"
                  : "info"
              }
            >
              <p className="text-sm font-medium">
                {data.requiredForMeta.alert ?? "Necessário para atingir a meta"}
              </p>
              {data.requiredForMeta.requiredDailyAverage !== null ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <ScenarioMetric
                    label="Média necessária"
                    value={formatScenarioMoney(
                      data.requiredForMeta.requiredDailyAverage,
                    )}
                  />
                  <ScenarioMetric
                    label="Crescimento %"
                    value={
                      data.requiredForMeta.requiredDailyGrowthPercent === null
                        ? "—"
                        : `${data.requiredForMeta.requiredDailyGrowthPercent.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`
                    }
                  />
                  <ScenarioMetric
                    label="Ticket necessário"
                    value={
                      data.requiredForMeta.requiredTicket === null
                        ? "—"
                        : formatScenarioMoney(
                            data.requiredForMeta.requiredTicket,
                          )
                    }
                  />
                  <ScenarioMetric
                    label="Vendas adicionais"
                    value={
                      data.requiredForMeta.additionalSalesNeeded === null
                        ? "—"
                        : data.requiredForMeta.additionalSalesNeeded.toLocaleString(
                            "pt-BR",
                            { maximumFractionDigits: 1 },
                          )
                    }
                  />
                </div>
              ) : null}
              {data.requiredForMeta.assumptions.length > 0 ? (
                <ul
                  className={cn(
                    "mt-3 list-disc space-y-1 pl-4",
                    exTypography.caption,
                  )}
                >
                  {data.requiredForMeta.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              ) : null}
            </ExecutiveCard>
          </div>
        ) : null}

        <div>
          <h3 className={cn("mb-3", exTypography.label)}>Cenários</h3>
          <div
            className={cn(
              "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
              exSpacing[12],
            )}
          >
            {data.scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                highlighted={
                  data.recommendation?.scenarioId === scenario.id
                }
              />
            ))}
          </div>
        </div>

        <ScenarioComparison
          scenarios={data.scenarios}
          recommendedId={data.recommendation?.scenarioId}
        />
      </div>
    </ExecutiveSection>
  );
}
