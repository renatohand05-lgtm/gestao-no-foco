import {
  PredictiveForecastCard,
} from "@/components/dashboard/predictive/predictive-forecast-card";
import {
  ExecutiveBadge,
  ExecutiveEmptyState,
  ExecutiveSection,
} from "@/components/executive";
import type { PredictiveIntelligenceResult } from "@/lib/predictive";
import { gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: PredictiveIntelligenceResult;
};

/**
 * Painel executivo de Predictive Intelligence (Gate 20.4).
 */
export function PredictiveIntelligencePanel({ data }: Props) {
  const empty = data.forecasts.every((f) => f.unavailableReason && f.evidence.length === 0);

  return (
    <div
      data-dashboard-block="predictive-intelligence"
      data-predictive-engine={data.engineVersion}
      className={cn("space-y-4", gofMotion.fade)}
    >
      <ExecutiveSection
        title="Predictive Intelligence"
        description={data.summary}
        panel
        actions={
          <ExecutiveBadge
            tone={
              data.overallConfidence === "alta"
                ? "success"
                : data.overallConfidence === "media"
                  ? "warning"
                  : "danger"
            }
            variant="soft"
          >
            Confiança {data.overallConfidenceLabel}
          </ExecutiveBadge>
        }
        className="space-y-4"
      >
        {data.warnings.length > 0 ? (
          <ul className="space-y-1" aria-label="Avisos preditivos">
            {data.warnings.map((w) => (
              <li key={w} className={cn(gofTypography.caption, "text-warning")}>
                {w}
              </li>
            ))}
          </ul>
        ) : null}

        {empty ? (
          <ExecutiveEmptyState
            title="Previsões indisponíveis"
            description="Cobertura insuficiente nos feeds atuais para montar previsões locais."
            className="py-6"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {data.forecasts.map((f) => (
              <PredictiveForecastCard key={f.domain} forecast={f} />
            ))}
          </div>
        )}

        <p className={gofTypography.caption}>
          Motor local {data.engineVersion} · sem IA generativa · somente evidências do
          tenant.
        </p>
      </ExecutiveSection>
    </div>
  );
}
