import { ExecutiveBadge, ExecutiveCard } from "@/components/executive";
import { PredictionConfidenceBadge } from "@/components/executive/predictions/prediction-confidence";
import { formatScenarioMoney } from "@/components/executive/predictions/scenario-metric";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { PredictionSummary } from "@/lib/predictions/types";

type Props = {
  summary: PredictionSummary;
};

const STATUS_LABEL: Record<PredictionSummary["status"], string> = {
  no_ritmo: "No ritmo",
  recuperacao: "Recuperação",
  atencao: "Atenção",
  critico: "Crítico",
  meta_atingida: "Meta atingida",
  meta_superada: "Meta superada",
  sem_meta: "Sem meta",
  periodo_futuro: "Período futuro",
  periodo_encerrado: "Período encerrado",
  dados_insuficientes: "Dados insuficientes",
};

const STATUS_TONE: Record<
  PredictionSummary["status"],
  "success" | "warning" | "danger" | "info"
> = {
  no_ritmo: "success",
  recuperacao: "info",
  atencao: "warning",
  critico: "danger",
  meta_atingida: "success",
  meta_superada: "success",
  sem_meta: "info",
  periodo_futuro: "info",
  periodo_encerrado: "info",
  dados_insuficientes: "warning",
};

export function PredictionSummaryCard({ summary }: Props) {
  return (
    <ExecutiveCard
      padding={24}
      accent={STATUS_TONE[summary.status]}
      className={cn(exAnimations.slide)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={exTypography.label}>Se o ritmo atual continuar</p>
        <ExecutiveBadge tone={STATUS_TONE[summary.status]}>
          {STATUS_LABEL[summary.status]}
        </ExecutiveBadge>
      </div>
      <p className="mt-3 text-lg font-semibold tracking-tight sm:text-xl">
        {summary.headline}
      </p>
      <p className={cn("mt-2", exTypography.caption)}>{summary.explanation}</p>
      <div className="mt-4 flex flex-wrap gap-4">
        <div>
          <p className={exTypography.label}>Projeção</p>
          <p className="text-sm font-semibold tabular-nums">
            {formatScenarioMoney(summary.baseProjectedRevenue)}
          </p>
        </div>
        <div>
          <p className={exTypography.label}>Gap projetado</p>
          <p className="text-sm font-semibold tabular-nums">
            {summary.baseProjectedGap === null
              ? "—"
              : formatScenarioMoney(summary.baseProjectedGap)}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <PredictionConfidenceBadge confidence={summary.confidence} />
      </div>
    </ExecutiveCard>
  );
}
