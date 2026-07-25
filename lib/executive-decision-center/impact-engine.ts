/**
 * Impacto / urgência / esforço (Gate 20.6) — determinístico.
 */

import type {
  EdcConfidence,
  EdcEffort,
  EdcPriority,
  EdcUrgency,
} from "./types.ts";

export function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeImpact(params: {
  severityBoost: number;
  scoreGap: number | null;
  hasFinancialSignal: boolean;
}): number {
  let impact = params.severityBoost;
  if (params.scoreGap != null) {
    impact = Math.max(impact, clamp01to100(params.scoreGap));
  }
  if (params.hasFinancialSignal) {
    impact = Math.min(100, impact + 8);
  }
  return clamp01to100(impact);
}

export function computeUrgency(params: {
  priorityHint: EdcPriority | null;
  riskCritical: boolean;
  cashNegative: boolean;
}): EdcUrgency {
  if (params.cashNegative || params.riskCritical) return "imediata";
  if (params.priorityHint === "critical") return "imediata";
  if (params.priorityHint === "high") return "alta";
  if (params.priorityHint === "medium") return "media";
  return "baixa";
}

export function computeEffort(params: {
  category: string;
  hasHref: boolean;
  complexity: "baixa" | "media" | "alta";
}): EdcEffort {
  if (params.complexity === "baixa" && params.hasHref) return "baixo";
  if (params.complexity === "alta") return "alto";
  return "medio";
}

export function computeConfidence(params: {
  partial: boolean;
  evidenceCount: number;
  sourceReliable: boolean;
}): EdcConfidence {
  if (params.evidenceCount === 0) return "baixa";
  if (!params.sourceReliable || params.partial) return "media";
  if (params.evidenceCount >= 2) return "alta";
  return "media";
}

export function priorityFromScores(params: {
  impact: number;
  urgency: EdcUrgency;
  confidence: EdcConfidence;
}): EdcPriority {
  const urg =
    params.urgency === "imediata"
      ? 4
      : params.urgency === "alta"
        ? 3
        : params.urgency === "media"
          ? 2
          : 1;
  const conf =
    params.confidence === "alta" ? 1 : params.confidence === "media" ? 0.85 : 0.7;
  const score = params.impact * 0.7 + urg * 10 * conf;
  if (score >= 85 || params.urgency === "imediata") return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function isQuickWin(params: {
  effort: EdcEffort;
  impact: number;
  confidence: EdcConfidence;
}): boolean {
  return (
    params.effort === "baixo" &&
    params.impact >= 55 &&
    params.confidence !== "baixa"
  );
}
