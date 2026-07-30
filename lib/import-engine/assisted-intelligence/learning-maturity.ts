/**
 * Sprint 22.7 — Maturidade de regras aprendidas (isolamento por tenant).
 */

import type { LearningMaturity } from "./types.ts";

export type MaturityInput = {
  hitCount: number;
  manuallyApproved?: boolean;
  isActive?: boolean;
};

/**
 * provisória → 1 confirmação
 * observação → 2–4 confirmações
 * confiável → ≥5 confirmações
 * aprovada manualmente → flag explícita
 */
export function resolveLearningMaturity(input: MaturityInput): LearningMaturity {
  if (input.manuallyApproved) return "manually_approved";
  const n = input.hitCount ?? 0;
  if (n >= 5) return "reliable";
  if (n >= 2) return "observing";
  return "provisional";
}

export function canAutoApplyLearnedRule(maturity: LearningMaturity, confidence: number): boolean {
  if (maturity === "manually_approved") return confidence >= 0.75;
  if (maturity === "reliable") return confidence >= 0.85;
  if (maturity === "observing") return false; // ainda exige revisão
  return false; // provisória nunca aplica silenciosamente
}
