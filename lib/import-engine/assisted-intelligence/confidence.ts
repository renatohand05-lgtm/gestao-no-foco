/**
 * Sprint 22.7 — Score de confiança e faixas explicáveis.
 */

import type { ConfidenceBand } from "./types.ts";

export function confidenceBand(score: number): ConfidenceBand {
  if (!Number.isFinite(score) || score < 0) return "unrecognized";
  if (score >= 0.85) return "high";
  if (score >= 0.65) return "medium";
  if (score >= 0.35) return "low";
  return "unrecognized";
}

export function clampConfidence(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
}

export function averageConfidence(scores: number[]): number {
  if (!scores.length) return 0;
  return clampConfidence(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** Baixa confiança nunca pode ser confirmada silenciosamente. */
export function requiresHumanReview(score: number, threshold = 0.75): boolean {
  return score < threshold;
}
