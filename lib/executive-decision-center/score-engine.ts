/**
 * Executive Score do Decision Center (Gate 20.6).
 * Reutiliza Business Health + Predictive · sem inventar.
 */

import type { BusinessHealthResult } from "../dashboard/business-health-engine.ts";
import type { PredictiveIntelligenceResult } from "../predictive/types.ts";
import type { EdcConfidence, EdcExecutiveScore } from "./types.ts";
import { EDC_CONFIDENCE_LABEL } from "./types.ts";
import { clamp01to100 } from "./impact-engine.ts";

const WEIGHTS = {
  finance: 20,
  cashflow: 15,
  sales: 15,
  inventory: 10,
  operations: 15,
  goals: 10,
  risks: 10,
  forecasts: 5,
} as const;

function riskToScore(risk: string): number | null {
  if (risk === "baixo") return 90;
  if (risk === "moderado") return 70;
  if (risk === "alto") return 45;
  if (risk === "critico") return 20;
  return null;
}

export function computeExecutiveDecisionScore(params: {
  bh: BusinessHealthResult;
  predictive: PredictiveIntelligenceResult;
}): EdcExecutiveScore {
  const { bh, predictive } = params;

  const cashForecast = predictive.forecasts.find((f) => f.domain === "fluxo_caixa");
  const salesForecast = predictive.forecasts.find((f) => f.domain === "faturamento");
  const goalForecast = predictive.forecasts.find((f) => f.domain === "metas");
  const stockForecast = predictive.forecasts.find((f) => f.domain === "estoque");
  const opForecast = predictive.forecasts.find(
    (f) => f.domain === "risco_operacional",
  );

  const dimensions: EdcExecutiveScore["dimensions"] = [
    {
      key: "finance",
      label: "Saúde financeira",
      score: bh.finance.score,
      weight: WEIGHTS.finance,
    },
    {
      key: "cashflow",
      label: "Fluxo de caixa",
      score:
        cashForecast && cashForecast.risk !== "indisponivel"
          ? riskToScore(cashForecast.risk)
          : bh.finance.score,
      weight: WEIGHTS.cashflow,
    },
    {
      key: "sales",
      label: "Vendas",
      score: bh.commercial.score ?? (salesForecast ? riskToScore(salesForecast.risk) : null),
      weight: WEIGHTS.sales,
    },
    {
      key: "inventory",
      label: "Estoque",
      score:
        bh.inventory.score ??
        (stockForecast ? riskToScore(stockForecast.risk) : null),
      weight: WEIGHTS.inventory,
    },
    {
      key: "operations",
      label: "Operação",
      score:
        bh.operation.score ?? (opForecast ? riskToScore(opForecast.risk) : null),
      weight: WEIGHTS.operations,
    },
    {
      key: "goals",
      label: "Metas",
      score: goalForecast ? riskToScore(goalForecast.risk) : bh.commercial.score,
      weight: WEIGHTS.goals,
    },
    {
      key: "risks",
      label: "Riscos",
      score:
        bh.overallScore == null
          ? null
          : clamp01to100(
              bh.overallStatus === "critico"
                ? 25
                : bh.overallStatus === "atencao"
                  ? 55
                  : bh.overallStatus === "saudavel"
                    ? 80
                    : bh.overallStatus === "excelente"
                      ? 95
                      : 50,
            ),
      weight: WEIGHTS.risks,
    },
    {
      key: "forecasts",
      label: "Previsões",
      score:
        predictive.overallConfidence === "alta"
          ? 85
          : predictive.overallConfidence === "media"
            ? 65
            : predictive.forecasts.some((f) => f.evidence.length > 0)
              ? 45
              : null,
      weight: WEIGHTS.forecasts,
    },
  ];

  const available = dimensions.filter((d) => d.score != null);
  const unavailable = dimensions
    .filter((d) => d.score == null)
    .map((d) => d.label);

  let value: number | null = null;
  if (available.length >= 3) {
    const totalW = available.reduce((s, d) => s + d.weight, 0);
    const sum = available.reduce(
      (s, d) => s + (d.score as number) * (d.weight / totalW),
      0,
    );
    value = clamp01to100(sum);
  }

  const confidence: EdcConfidence =
    available.length >= 6
      ? "alta"
      : available.length >= 3
        ? "media"
        : "baixa";

  return {
    value,
    label:
      value == null
        ? "Indisponível"
        : value >= 80
          ? "Saudável"
          : value >= 65
            ? "Atenção"
            : "Crítico",
    confidence,
    dimensions,
    unavailable,
  };
}

export function executiveScoreCaption(score: EdcExecutiveScore): string {
  if (score.value == null) {
    return `Score indisponível · confiança ${EDC_CONFIDENCE_LABEL[score.confidence]}.`;
  }
  return `Executive Score ${score.value}/100 · ${score.label} · confiança ${EDC_CONFIDENCE_LABEL[score.confidence]}.`;
}
