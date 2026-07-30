/**
 * Sprint 25.1 — Custo médio móvel (metodologia documentada).
 * Reutiliza calcCustoMedioPonderado do módulo NF-e — sem inventar custo.
 *
 * Regras:
 * - Entrada com custo_unitario atualiza custo médio ponderado.
 * - Saída / transferência / reserva NÃO recalculam custo médio.
 * - Sem custo na entrada: mantém custo anterior (não inventa).
 * - Divisão por zero → retorna custo anterior ou null.
 */

import { calcCustoMedioPonderado } from "../../nfe/nfe-custo.ts";

export type AverageCostInput = {
  estoqueAnterior: number;
  custoAnterior: number | null;
  quantidadeEntrada: number;
  custoUnitarioEntrada: number | null;
};

export function resolveAverageCost(input: AverageCostInput): {
  custo: number | null;
  updated: boolean;
  reason: string;
} {
  const qty = input.quantidadeEntrada;
  if (!(qty > 0) || !Number.isFinite(qty)) {
    return {
      custo: input.custoAnterior,
      updated: false,
      reason: "Quantidade de entrada inválida — custo inalterado.",
    };
  }

  if (
    input.custoUnitarioEntrada == null ||
    !Number.isFinite(input.custoUnitarioEntrada)
  ) {
    return {
      custo: input.custoAnterior,
      updated: false,
      reason: "Custo unitário ausente — não inventar; custo inalterado.",
    };
  }

  if (input.custoUnitarioEntrada < 0) {
    return {
      custo: input.custoAnterior,
      updated: false,
      reason: "Custo unitário negativo rejeitado.",
    };
  }

  const next = calcCustoMedioPonderado({
    saldoAtual: Math.max(0, input.estoqueAnterior),
    custoMedioAtual: input.custoAnterior,
    quantidadeEntrada: qty,
    custoUnitarioEntrada: input.custoUnitarioEntrada,
  });

  if (next == null || !Number.isFinite(next)) {
    return {
      custo: input.custoAnterior,
      updated: false,
      reason: "Cálculo indisponível (evita NaN/Infinity).",
    };
  }

  return {
    custo: next,
    updated: true,
    reason: "Custo médio ponderado atualizado na entrada.",
  };
}

export const AVERAGE_COST_METHODOLOGY = {
  id: "weighted_moving_average_v1",
  formula:
    "(estoque_anterior × custo_anterior + qty_entrada × custo_unitario) / (estoque_anterior + qty_entrada)",
  source: "lib/nfe/nfe-custo · lib/supply/enterprise/average-cost",
  notes: [
    "Somente entradas com custo unitário válido atualizam.",
    "Saídas e transferências preservam o custo médio vigente.",
    "Sem custo informado: indisponível — não inventar.",
  ],
} as const;
