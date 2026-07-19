/**
 * Agregação Top-N de rankings do Dashboard.
 * Ordenação: valor decrescente (mesma regra histórica).
 * Limite padrão: 5. Não aplicar limit antes da soma.
 */

import type { DashboardRankingItem } from "@/types/dashboard-executive";

export const DASHBOARD_RANKING_LIMIT = 5;

export type RankingAggregate = {
  label: string;
  value: number;
};

export function topN(
  map: Map<string, RankingAggregate>,
  limit = DASHBOARD_RANKING_LIMIT,
): DashboardRankingItem[] {
  return [...map.entries()]
    .map(([id, item]) => ({ id, label: item.label, value: item.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function addToRanking(
  map: Map<string, RankingAggregate>,
  id: string,
  label: string,
  amount: number,
) {
  const current = map.get(id) ?? { label, value: 0 };
  current.value += amount;
  map.set(id, current);
}
