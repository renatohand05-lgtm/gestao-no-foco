/**
 * Comparadores de negócio (Sprint 11.2) — arquitetura + mês anterior.
 * Dimensões futuras (semana/ano/trimestre/centro/filial) ficam tipadas,
 * disponíveis=false até existir payload — sem inventar dados.
 */

import type { ExecutiveIntelligenceInput } from "@/lib/intelligence/types";
import type {
  BusinessComparatorDimension,
  BusinessComparatorSnapshot,
} from "@/lib/business-intelligence/types";

const FUTURE_DIMENSIONS: Array<{
  dimension: BusinessComparatorDimension;
  label: string;
}> = [
  { dimension: "semana", label: "Semana anterior" },
  { dimension: "trimestre", label: "Trimestre anterior" },
  { dimension: "ano", label: "Ano anterior" },
  { dimension: "centro", label: "Por centro de custo" },
  { dimension: "filial", label: "Por filial" },
];

/**
 * Comparador ativo: mês anterior (quando `crescimento` / ticket existem no input).
 */
export function buildMonthOverMonthComparator(
  input: ExecutiveIntelligenceInput,
): BusinessComparatorSnapshot {
  const hasGrowth = input.crescimentoPeriodo !== null;
  const hasTicket = input.ticketVariacaoPct !== null;

  return {
    dimension: "mes_anterior",
    label: "Mês anterior",
    available: hasGrowth || hasTicket || input.ticketAnterior > 0,
    metrics: [
      {
        key: "crescimento",
        label: "Crescimento do realizado",
        current: input.realizado,
        previous: null,
        variationPct: input.crescimentoPeriodo,
      },
      {
        key: "ticket",
        label: "Ticket médio",
        current: input.ticketAtual,
        previous: input.ticketAnterior,
        variationPct: input.ticketVariacaoPct,
      },
    ],
    note: hasGrowth || hasTicket
      ? "Comparação com o mês anterior usando dados já carregados no painel."
      : "Comparação com o mês anterior indisponível neste período.",
  };
}

/** Catálogo de dimensões futuras — não altera UI nesta sprint. */
export function listComparatorDimensions(): Array<{
  dimension: BusinessComparatorDimension;
  label: string;
  implemented: boolean;
}> {
  return [
    {
      dimension: "mes_anterior",
      label: "Mês anterior",
      implemented: true,
    },
    ...FUTURE_DIMENSIONS.map((d) => ({
      ...d,
      implemented: false,
    })),
  ];
}

export function buildUnavailableComparator(
  dimension: BusinessComparatorDimension,
  label: string,
): BusinessComparatorSnapshot {
  return {
    dimension,
    label,
    available: false,
    metrics: [],
    note: `Comparação por ${label.toLowerCase()} ainda não possui payload dedicado.`,
  };
}
