/**
 * Stub de infraestrutura para IA futura — Sprint 29.4.
 * Sem LLM, sem rede, sem provider externo.
 */

import type { ExecutiveAiFutureHook } from "./types.ts";

export const EXECUTIVE_AI_FUTURE_HOOK: ExecutiveAiFutureHook = {
  mode: "deterministic",
  providerId: "gestao-nofoco.executive-intelligence.v1",
  llmEnabled: false,
  capabilities: [
    "trend-detection",
    "anomaly-hint",
    "seasonality-hint",
    "score-projection",
    "recommendation-blueprint",
  ],
};

export function getExecutiveAiFutureHook(): ExecutiveAiFutureHook {
  return EXECUTIVE_AI_FUTURE_HOOK;
}
