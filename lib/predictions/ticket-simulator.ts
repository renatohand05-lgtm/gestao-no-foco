import {
  classifyCoverageViability,
  resolvePredictionConfidence,
} from "@/lib/predictions/confidence";
import {
  clampNonNegative,
  estimateProbabilityForProjection,
  estimateRemainingSales,
  projectedAttainment,
  projectedGap,
} from "@/lib/predictions/projection-math";
import type {
  PredictionInput,
  TicketScenarioResult,
} from "@/lib/predictions/types";

export type TicketParams = {
  absoluteDelta?: number;
  percentDelta?: number;
};

/**
 * Simula alteração do ticket médio mantendo volume estimado constante.
 */
export function simulateTicket(
  input: PredictionInput,
  params: TicketParams,
): TicketScenarioResult {
  const confidence = resolvePredictionConfidence(input);
  const abs = params.absoluteDelta ?? 0;
  const pct = params.percentDelta ?? 0;

  let newTicket = input.ticketAtual;
  if (params.absoluteDelta !== undefined && params.absoluteDelta !== 0) {
    newTicket = input.ticketAtual + abs;
  } else if (params.percentDelta !== undefined) {
    newTicket = input.ticketAtual * (1 + pct / 100);
  }
  newTicket = clampNonNegative(newTicket);

  const remainingSales = estimateRemainingSales(input);

  let assumption: string;
  let estimatedRevenue: number;
  let estimatedIncrement: number;

  if (remainingSales === null) {
    assumption =
      "Base insuficiente para estimar volume restante (poucas vendas ou dias). Ticket simulado sem projetar receita adicional.";
    estimatedRevenue = input.projecaoDiasUteis;
    estimatedIncrement = 0;
  } else if (input.periodoEncerrado || input.diasUteisRestantes <= 0) {
    assumption =
      "Período encerrado — alteração de ticket não altera a receita já realizada.";
    estimatedRevenue = input.realizado;
    estimatedIncrement = 0;
  } else {
    const baseRemainingRevenue = remainingSales * input.ticketAtual;
    const newRemainingRevenue = remainingSales * newTicket;
    estimatedIncrement = newRemainingRevenue - baseRemainingRevenue;
    estimatedRevenue = input.realizado + newRemainingRevenue;
    assumption =
      params.absoluteDelta !== undefined && params.absoluteDelta !== 0
        ? `Ticket alterado em ${abs >= 0 ? "+" : ""}${abs.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} mantendo ~${remainingSales.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} venda(s) restantes (ritmo atual de quantidade).`
        : `Ticket alterado em ${pct >= 0 ? "+" : ""}${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% mantendo ~${remainingSales.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} venda(s) restantes (ritmo atual de quantidade).`;
  }

  const viability =
    remainingSales === null
      ? "dados_insuficientes"
      : classifyCoverageViability(estimatedRevenue, input.metaMensal, input);

  return {
    newTicket,
    estimatedRevenue,
    estimatedIncrement,
    projectedAttainment: projectedAttainment(estimatedRevenue, input.metaMensal),
    projectedGap: projectedGap(estimatedRevenue, input.metaMensal),
    probability: estimateProbabilityForProjection(input, estimatedRevenue),
    assumption,
    confidence,
    viability,
    estimatedRemainingSales: remainingSales,
  };
}

export function simulateTicketPercent(
  input: PredictionInput,
  percentDelta: number,
): TicketScenarioResult {
  return simulateTicket(input, { percentDelta });
}
