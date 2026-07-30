/**
 * Sprint 26.7 — Ranking inteligente de fornecedores (pesos configuráveis).
 */

import { roundMoney } from "./money-utils.ts";
import type {
  TaxSupplierRankItem,
  TaxSupplierRankingWeights,
  TaxSupplierSnapshot,
} from "./types.ts";

export const DEFAULT_SUPPLIER_WEIGHTS: TaxSupplierRankingWeights = {
  taxImpact: 0.2,
  fiscalBenefit: 0.15,
  totalCost: 0.25,
  history: 0.15,
  location: 0.05,
  regime: 0.1,
  operational: 0.1,
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeWeights(
  weights: TaxSupplierRankingWeights,
): TaxSupplierRankingWeights {
  const sum =
    weights.taxImpact +
    weights.fiscalBenefit +
    weights.totalCost +
    weights.history +
    weights.location +
    weights.regime +
    weights.operational;
  if (sum <= 0) return DEFAULT_SUPPLIER_WEIGHTS;
  return {
    taxImpact: weights.taxImpact / sum,
    fiscalBenefit: weights.fiscalBenefit / sum,
    totalCost: weights.totalCost / sum,
    history: weights.history / sum,
    location: weights.location / sum,
    regime: weights.regime / sum,
    operational: weights.operational / sum,
  };
}

/**
 * Ranking determinístico. Scores de regime/localização vêm de metadata
 * configurada (ex.: regime_affinity, location_score) — sem tabela fiscal hardcoded.
 */
export function rankTaxSuppliers(
  suppliers: TaxSupplierSnapshot[],
  weights: TaxSupplierRankingWeights = DEFAULT_SUPPLIER_WEIGHTS,
): TaxSupplierRankItem[] {
  if (suppliers.length === 0) return [];
  const w = normalizeWeights(weights);
  const maxCost = Math.max(...suppliers.map((s) => s.unitCost), 1);

  const scored = suppliers.map((s) => {
    const costScore = clamp01(1 - s.unitCost / maxCost);
    const history = clamp01(s.historicalReliability);
    const operational = clamp01(s.operationalScore);
    const fiscal = clamp01(s.taxBenefitScore ?? 0);
    const location = clamp01(
      typeof s.metadata?.location_score === "number"
        ? s.metadata.location_score
        : 0.5,
    );
    const regime = clamp01(
      typeof s.metadata?.regime_affinity === "number"
        ? s.metadata.regime_affinity
        : s.regimeCode
          ? 0.6
          : 0.3,
    );
    const taxImpact = clamp01(
      typeof s.metadata?.tax_impact_score === "number"
        ? s.metadata.tax_impact_score
        : fiscal,
    );

    const breakdown = {
      taxImpact,
      fiscalBenefit: fiscal,
      totalCost: costScore,
      history,
      location,
      regime,
      operational,
    };

    const score = roundMoney(
      taxImpact * w.taxImpact +
        fiscal * w.fiscalBenefit +
        costScore * w.totalCost +
        history * w.history +
        location * w.location +
        regime * w.regime +
        operational * w.operational,
    );

    const justification = [
      `Custo relativo ${costScore.toFixed(2)}`,
      `benefício fiscal ${fiscal.toFixed(2)}`,
      `histórico ${history.toFixed(2)}`,
      `operacional ${operational.toFixed(2)}`,
      `regime ${regime.toFixed(2)}`,
      `localização ${location.toFixed(2)}`,
    ].join("; ");

    return {
      supplierId: s.id,
      name: s.name,
      score,
      rank: 0,
      justification: `Score ${score} — ${justification}. Revisão humana obrigatória.`,
      breakdown,
      requiresHumanReview: true as const,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((item, idx) => ({ ...item, rank: idx + 1 }));
}
