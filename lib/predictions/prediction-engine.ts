import { toExecutiveIntelligenceInput } from "@/lib/intelligence";
import { resolvePredictionConfidence } from "@/lib/predictions/confidence";
import { simulateDailyAverage } from "@/lib/predictions/daily-target-simulator";
import {
  buildBaseScenario,
  simulateRecoveryDays,
} from "@/lib/predictions/revenue-simulator";
import {
  buildDefaultScenarios,
  buildRequiredForMeta,
} from "@/lib/predictions/scenario-builder";
import { recommendBestScenario } from "@/lib/predictions/scenario-recommendation";
import { PREDICTION_DEFAULT_SIMULATOR } from "@/lib/predictions/thresholds";
import { simulateTicket } from "@/lib/predictions/ticket-simulator";
import type {
  PredictionEngineResult,
  PredictionInput,
  PredictionSummary,
  SimulatorParams,
} from "@/lib/predictions/types";
import type { CommercialPanelData } from "@/types/commercial-panel";

/**
 * Mapeia painel comercial → PredictionInput (zero fetch).
 */
export function toPredictionInput(
  panel: CommercialPanelData,
  tenantSlug: string,
): PredictionInput {
  const ei = toExecutiveIntelligenceInput(panel, tenantSlug);
  return {
    metaMensal: ei.metaMensal,
    realizado: ei.realizado,
    projecaoAtual: ei.projecaoDiasUteis,
    projecaoDiasUteis: ei.projecaoDiasUteis,
    mediaDiariaAtual: ei.mediaDiariaUtil,
    necessarioDiaUtil: ei.necessarioDiaUtil,
    diasUteisRestantes: ei.diasUteisRestantes,
    diasUteisDecorridos: ei.diasUteisDecorridos,
    ticketAtual: ei.ticketAtual,
    ticketAnterior: ei.ticketAnterior,
    quantidadeVendas: ei.vendasQuantidade,
    ritmoAtual: ei.ritmoAtual,
    ritmoEsperado: ei.ritmoEsperado,
    tendencia: ei.tendencia,
    confianca: ei.confianca,
    confiancaMotivo: ei.confiancaMotivo,
    probabilidadeMeta: ei.probabilidadeMeta,
    probabilidadeScore: ei.probabilidadeScore,
    crescimentoPeriodo: ei.crescimentoPeriodo,
    periodoEncerrado: ei.periodoEncerrado,
    periodoFuturo: ei.periodoFuturo,
    possuiMeta: ei.possuiMeta,
    volatilidade: 0.4,
  };
}

function buildSummary(
  input: PredictionInput,
): PredictionSummary {
  const base = buildBaseScenario(input);
  const confidence = resolvePredictionConfidence(input);

  let headline: string;
  if (input.periodoFuturo) {
    headline = "Previsões ficam informativas até o início da competência.";
  } else if (!input.possuiMeta) {
    headline = `Projeção no ritmo atual: ${base.projectedRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (sem meta).`;
  } else if (base.status === "meta_atingida" || base.status === "meta_superada") {
    headline = "No ritmo atual, a meta já está coberta ou superada pela projeção.";
  } else if (base.projectedGap !== null && base.projectedGap > 0) {
    headline = `Mantendo o ritmo, o gap projetado é ${base.projectedGap.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`;
  } else {
    headline = "O ritmo atual sustenta o fechamento próximo da meta.";
  }

  return {
    headline,
    explanation: base.explanation,
    status: base.status,
    confidence,
    baseProjectedRevenue: base.projectedRevenue,
    baseProjectedGap: base.projectedGap,
  };
}

/**
 * Orquestra Prediction & Scenario Engine.
 */
export function buildPredictionEngine(
  panel: CommercialPanelData,
  tenantSlug: string,
  simulator?: Partial<SimulatorParams>,
): PredictionEngineResult {
  const input = toPredictionInput(panel, tenantSlug);
  const params: SimulatorParams = {
    ...PREDICTION_DEFAULT_SIMULATOR,
    ...simulator,
  };

  const base = buildBaseScenario(input);
  const requiredForMeta = buildRequiredForMeta(input);
  const scenarios = buildDefaultScenarios(input, requiredForMeta);
  const recommendation = recommendBestScenario(input, scenarios);

  const customDaily =
    !input.periodoFuturo && input.diasUteisRestantes > 0
      ? simulateDailyAverage(input, {
          absoluteDelta: params.dailyAbsoluteDelta || undefined,
          percentDelta:
            params.dailyAbsoluteDelta !== 0
              ? undefined
              : params.dailyPercentDelta,
        })
      : null;

  const customTicket =
    !input.periodoFuturo && input.ticketAtual > 0
      ? simulateTicket(input, {
          absoluteDelta: params.ticketAbsoluteDelta || undefined,
          percentDelta:
            params.ticketAbsoluteDelta !== 0
              ? undefined
              : params.ticketPercentDelta,
        })
      : null;

  const customRecovery =
    !input.periodoFuturo && input.diasUteisRestantes > 0
      ? simulateRecoveryDays(input, {
          days: params.recoveryDays,
          liftPercent: params.recoveryLiftPercent,
        })
      : null;

  return {
    summary: buildSummary(input),
    base,
    requiredForMeta,
    scenarios,
    recommendation,
    customDaily,
    customTicket,
    customRecovery,
    defaultSimulatorParams: params,
  };
}

/** Recalcula simulações customizadas em memória (UI do simulador). */
export function runCustomSimulations(
  input: PredictionInput,
  params: SimulatorParams,
) {
  return {
    daily: simulateDailyAverage(input, {
      absoluteDelta: params.dailyAbsoluteDelta || undefined,
      percentDelta:
        params.dailyAbsoluteDelta !== 0
          ? undefined
          : params.dailyPercentDelta,
    }),
    ticket: simulateTicket(input, {
      absoluteDelta: params.ticketAbsoluteDelta || undefined,
      percentDelta:
        params.ticketAbsoluteDelta !== 0
          ? undefined
          : params.ticketPercentDelta,
    }),
    recovery: simulateRecoveryDays(input, {
      days: params.recoveryDays,
      liftPercent: params.recoveryLiftPercent,
    }),
  };
}
