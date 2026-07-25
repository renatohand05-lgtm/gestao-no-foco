/**
 * Predictive Intelligence — formatação e classificação (Gate 20.4).
 */

import type {
  PredictiveConfidence,
  PredictiveRiskLevel,
  PredictiveTrend,
} from "./types.ts";
import {
  PREDICTIVE_CONFIDENCE_LABEL,
  PREDICTIVE_RISK_LABEL,
  PREDICTIVE_TREND_LABEL,
} from "./types.ts";

export function formatPredictiveMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Indisponível";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPredictivePct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Indisponível";
  return `${Math.round(value)}%`;
}

export function formatPredictiveCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Indisponível";
  return String(Math.round(value));
}

export function confidenceFromCoverage(
  availableFields: number,
  totalFields: number,
  partial: boolean,
): PredictiveConfidence {
  if (totalFields <= 0 || availableFields <= 0) return "baixa";
  const ratio = availableFields / totalFields;
  if (partial || ratio < 0.5) return "baixa";
  if (ratio < 0.85) return "media";
  return "alta";
}

export function trendFromDelta(
  current: number | null,
  projected: number | null,
): PredictiveTrend {
  if (
    current == null ||
    projected == null ||
    !Number.isFinite(current) ||
    !Number.isFinite(projected)
  ) {
    return "indisponivel";
  }
  const delta = projected - current;
  const base = Math.max(Math.abs(current), 1);
  const pct = delta / base;
  if (pct > 0.03) return "alta";
  if (pct < -0.03) return "queda";
  return "estavel";
}

export function riskFromScore(score: number | null): PredictiveRiskLevel {
  if (score == null || !Number.isFinite(score)) return "indisponivel";
  if (score >= 80) return "baixo";
  if (score >= 65) return "moderado";
  if (score >= 40) return "alto";
  return "critico";
}

export function riskFromCounts(critical: number, warning: number): PredictiveRiskLevel {
  if (critical > 0) return "critico";
  if (warning >= 3) return "alto";
  if (warning >= 1) return "moderado";
  return "baixo";
}

export function worstConfidence(
  levels: PredictiveConfidence[],
): PredictiveConfidence {
  if (levels.includes("baixa")) return "baixa";
  if (levels.includes("media")) return "media";
  if (levels.length === 0) return "baixa";
  return "alta";
}

export function labelConfidence(c: PredictiveConfidence): string {
  return PREDICTIVE_CONFIDENCE_LABEL[c];
}

export function labelTrend(t: PredictiveTrend): string {
  return PREDICTIVE_TREND_LABEL[t];
}

export function labelRisk(r: PredictiveRiskLevel): string {
  return PREDICTIVE_RISK_LABEL[r];
}
