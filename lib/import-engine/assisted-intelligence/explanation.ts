/**
 * Sprint 22.7 — Explicação estruturada de sugestões (sem justificativas genéricas).
 */

import type { ClassificationDecision, ExplainedSuggestion } from "./types.ts";

export type SuggestionExplanation = {
  suggested: string | null;
  why: string;
  priorityRule: string;
  signals: string[];
  confidence: number;
  band: string;
  alternatives: Array<{ value: string; confidence: number; reason: string }>;
  attribution: string;
};

export function explainSuggestion(s: ExplainedSuggestion): SuggestionExplanation {
  return {
    suggested: s.value,
    why: s.reason,
    priorityRule: s.origin,
    signals: s.signals,
    confidence: s.confidence,
    band: s.band,
    alternatives: s.alternatives,
    attribution: s.attribution,
  };
}

export function explainClassification(decision: ClassificationDecision): {
  overall: string;
  category: SuggestionExplanation;
  winningOrigin: string;
  requiresHumanReview: boolean;
  duplicate: ClassificationDecision["duplicate"];
} {
  return {
    overall: `Origem vencedora: ${decision.winningOrigin}; confiança ${(decision.overallConfidence * 100).toFixed(0)}% (${decision.overallBand}).`,
    category: explainSuggestion(decision.category),
    winningOrigin: decision.winningOrigin,
    requiresHumanReview: decision.requiresHumanReview,
    duplicate: decision.duplicate,
  };
}
