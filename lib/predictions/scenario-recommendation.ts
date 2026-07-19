import { confidenceLabel, confidenceNumeric } from "@/lib/predictions/confidence";
import { PREDICTION_RECOMMENDATION_WEIGHTS } from "@/lib/predictions/thresholds";
import type {
  PredictionInput,
  ScenarioCardModel,
  ScenarioRecommendation,
} from "@/lib/predictions/types";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function effortLabel(score: number): string {
  if (score <= 25) return "Baixo";
  if (score <= 55) return "Moderado";
  if (score <= 80) return "Alto";
  return "Muito alto";
}

function riskLabel(score: number): string {
  if (score <= 25) return "Baixo";
  if (score <= 55) return "Moderado";
  if (score <= 80) return "Alto";
  return "Muito alto";
}

/**
 * Recomenda o melhor cenário (determinístico).
 * Critérios: impacto, esforço inverso, risco inverso, confiança, proximidade da meta.
 */
export function recommendBestScenario(
  input: PredictionInput,
  scenarios: ScenarioCardModel[],
): ScenarioRecommendation | null {
  if (scenarios.length === 0) return null;

  // Exclui base se houver alternativas com incremento positivo; senão mantém base
  const candidates =
    scenarios.filter((s) => s.kind !== "base" && s.estimatedIncrement > 0)
      .length > 0
      ? scenarios.filter(
          (s) => s.kind === "base" || s.estimatedIncrement > 0,
        )
      : scenarios;

  let best = candidates[0]!;
  let bestScore = -Infinity;

  for (const s of candidates) {
    const proximity =
      input.metaMensal && input.metaMensal > 0
        ? Math.min(100, (s.projectedRevenue / input.metaMensal) * 100)
        : s.impactScore;

    const composite =
      s.impactScore * PREDICTION_RECOMMENDATION_WEIGHTS.impact +
      (100 - s.effortScore) * PREDICTION_RECOMMENDATION_WEIGHTS.effortInverse +
      (100 - s.riskScore) * PREDICTION_RECOMMENDATION_WEIGHTS.riskInverse +
      confidenceNumeric(s.confidence) *
        PREDICTION_RECOMMENDATION_WEIGHTS.confidence +
      proximity * PREDICTION_RECOMMENDATION_WEIGHTS.proximity;

    // Penaliza inviáveis sem excluir (transparência)
    const penalty =
      s.viability === "impossivel"
        ? 25
        : s.viability === "improvavel"
          ? 12
          : s.viability === "dados_insuficientes"
            ? 15
            : 0;

    const finalScore = composite - penalty;
    if (finalScore > bestScore) {
      bestScore = finalScore;
      best = s;
    }
  }

  const confidenceWarning =
    best.confidence === "baixa"
      ? "Confiança baixa — trate a recomendação como orientação, não como garantia."
      : best.viability === "improvavel" || best.viability === "impossivel"
        ? `${best.viabilityLabel}. Avalie se o esforço é realista antes de comprometer a equipe.`
        : null;

  const actionPlan: string[] = [];
  if (best.kind === "base") {
    actionPlan.push("Manter o ritmo diário atual e monitorar o gap diariamente.");
  } else if (best.kind === "daily_average") {
    actionPlan.push(
      `Elevar a média diária útil conforme o cenário (+${formatCurrency(Math.max(0, best.estimatedIncrement) / Math.max(1, input.diasUteisRestantes))} / dia em incremento médio).`,
    );
    actionPlan.push("Acompanhar os próximos dias úteis contra a nova régua.");
  } else if (best.kind === "ticket") {
    actionPlan.push(
      "Proteger mix e descontos para sustentar o ticket simulado.",
    );
    actionPlan.push("Manter volume estimado — a simulação assume quantidade constante.");
  } else if (best.kind === "recovery") {
    actionPlan.push(
      "Concentrar esforço comercial em dias consecutivos acima da meta diária.",
    );
    actionPlan.push("Reavaliar após a janela de recuperação.");
  } else {
    actionPlan.push(
      "Executar o plano mínimo necessário (média/ticket/volume) para fechar a meta.",
    );
    actionPlan.push("Validar viabilidade com a operação antes de comprometer forecast.");
  }

  if (input.possuiMeta && best.projectedGap !== null && best.projectedGap > 0) {
    actionPlan.push(
      `Gap projetado residual: ${formatCurrency(best.projectedGap)}.`,
    );
  }

  return {
    scenarioId: best.id,
    title: best.name,
    rationale: `Escolhido por melhor equilíbrio entre impacto (${best.impactScore}), esforço (${best.effortScore}), risco (${best.riskScore}) e ${confidenceLabel(best.confidence).toLowerCase()}. ${best.description}`,
    expectedImpact:
      best.estimatedIncrement === 0
        ? `Mantém projeção em ${formatCurrency(best.projectedRevenue)}.`
        : `Incremento estimado de ${formatCurrency(best.estimatedIncrement)} → projeção ${formatCurrency(best.projectedRevenue)}.`,
    effort: effortLabel(best.effortScore),
    risk: riskLabel(best.riskScore),
    confidence: best.confidence,
    actionPlan,
    confidenceWarning,
  };
}
