import { resolveProbabilidade } from "@/types/commercial-panel";
import type {
  PredictionInput,
  ProbabilityEstimate,
} from "@/lib/predictions/types";

export function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function projectedAttainment(
  revenue: number,
  meta: number | null,
): number | null {
  if (meta === null || meta <= 0) return null;
  return (revenue / meta) * 100;
}

export function projectedGap(
  revenue: number,
  meta: number | null,
): number | null {
  if (meta === null) return null;
  return meta - revenue;
}

/**
 * Estima vendas restantes mantendo o ritmo recente de quantidade.
 * Premissa documentada — não inventa se não há base.
 */
export function estimateRemainingSales(input: PredictionInput): number | null {
  if (input.periodoEncerrado || input.diasUteisRestantes <= 0) return 0;
  if (input.diasUteisDecorridos > 0 && input.quantidadeVendas > 0) {
    return (
      (input.quantidadeVendas / input.diasUteisDecorridos) *
      input.diasUteisRestantes
    );
  }
  if (input.ticketAtual > 0 && input.mediaDiariaAtual > 0) {
    return (
      (input.mediaDiariaAtual * input.diasUteisRestantes) / input.ticketAtual
    );
  }
  return null;
}

/**
 * Reusa o modelo oficial de probabilidade com projeção simulada.
 * Volatilidade vem do input (já calculada no painel) — sem duplicar fórmula.
 */
export function estimateProbabilityForProjection(
  input: PredictionInput,
  projectedRevenue: number,
): ProbabilityEstimate {
  if (!input.possuiMeta || input.metaMensal === null) {
    return {
      label: "muito_baixa",
      score: 0,
      motivo: "Sem meta — probabilidade não aplicável à simulação.",
    };
  }

  const attainment = projectedAttainment(projectedRevenue, input.metaMensal);
  let ritmoDiff: number | null = null;
  if (attainment !== null) {
    // No horizonte de fechamento, 100% é o ritmo esperado.
    ritmoDiff = attainment - 100;
  } else if (input.ritmoAtual !== null) {
    ritmoDiff = input.ritmoAtual - input.ritmoEsperado;
  }

  const result = resolveProbabilidade({
    valorMeta: input.metaMensal,
    projecaoUteis: projectedRevenue,
    ritmoDiferencaPp: ritmoDiff,
    tendencia: input.tendencia,
    volatilidade: input.volatilidade,
    diasUteisDecorridos: input.diasUteisDecorridos,
    percentualAtingido: attainment,
  });

  return {
    label: result.probabilidade,
    score: result.score,
    motivo: result.motivo,
  };
}

export function revenueFromDailyAverage(
  input: PredictionInput,
  dailyAverage: number,
): number {
  if (input.periodoEncerrado || input.diasUteisRestantes <= 0) {
    return input.realizado;
  }
  return input.realizado + clampNonNegative(dailyAverage) * input.diasUteisRestantes;
}
