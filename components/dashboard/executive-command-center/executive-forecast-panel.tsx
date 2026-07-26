import { ExecutiveCommandEmptyState } from "@/components/dashboard/executive-command-center/executive-command-empty-state";
import { ExecutiveBadge, ExecutiveCard, ExecutiveSection } from "@/components/executive";
import type { EccForecastSlice } from "@/lib/executive-command-center";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  cashflow: EccForecastSlice | null;
  financial: EccForecastSlice | null;
  operational: EccForecastSlice | null;
};

function ForecastCard({
  title,
  slice,
}: {
  title: string;
  slice: EccForecastSlice | null;
}) {
  if (!slice || !slice.available) {
    return (
      <ExecutiveCard padding={16} className="space-y-2 h-full">
        <p className={gofTypography.caption}>{title}</p>
        <p className="text-sm font-semibold text-muted-foreground">
          Indisponível
        </p>
        <p className={gofTypography.caption}>
          {slice?.unavailableReason ?? "Sem evidência preditiva suficiente."}
        </p>
      </ExecutiveCard>
    );
  }

  return (
    <ExecutiveCard padding={16} className="space-y-2 h-full">
      <div className="flex flex-wrap items-center gap-2">
        <p className={gofTypography.caption}>{title}</p>
        <ExecutiveBadge tone="neutral" variant="outline">
          {slice.horizon}
        </ExecutiveBadge>
      </div>
      <p className="text-lg font-semibold tabular-nums text-foreground">
        {slice.primaryValue}
      </p>
      <p className={cn(gofTypography.subtitle, "text-sm")}>{slice.headline}</p>
      <p className={gofTypography.caption}>
        Risco {slice.riskLabel} · confiança {slice.confidence}
      </p>
    </ExecutiveCard>
  );
}

export function ExecutiveForecastPanel({
  cashflow,
  financial,
  operational,
}: Props) {
  const empty =
    (!cashflow || !cashflow.available) &&
    (!financial || !financial.available) &&
    (!operational || !operational.available);

  return (
    <ExecutiveSection
      title="Forecast"
      description="Fluxo de caixa · financeiro · operacional"
      panel
      className="space-y-3"
    >
      {empty ? (
        <ExecutiveCommandEmptyState
          title="Forecast indisponível"
          description="Predictive Intelligence sem cobertura suficiente."
          className="py-6"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <ForecastCard title="Fluxo de caixa previsto" slice={cashflow} />
          <ForecastCard title="Forecast financeiro" slice={financial} />
          <ForecastCard title="Previsão operacional" slice={operational} />
        </div>
      )}
    </ExecutiveSection>
  );
}
