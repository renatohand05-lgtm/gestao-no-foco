/**
 * Scores nomeados — apenas mapeamento de Executive AI / Business Health (Sprint 29.4).
 * Não altera fórmulas nem faixas.
 */

import type { BusinessHealthResult } from "../dashboard/business-health-engine.ts";
import type {
  ExecutiveAiModule,
  ExecutiveAiResult,
} from "../ai/executive-ai-types.ts";
import type { ExecutiveNamedScores } from "./types.ts";

function moduleScore(
  ai: ExecutiveAiResult,
  module: ExecutiveAiModule,
): number | null {
  return ai.moduleScores.find((m) => m.module === module)?.score ?? null;
}

export function scoresFromExecutiveAi(
  ai: ExecutiveAiResult | null | undefined,
): ExecutiveNamedScores {
  if (!ai) {
    return {
      overall: null,
      financeiro: null,
      comercial: null,
      operacional: null,
      crm: null,
      estoque: null,
      source: "unavailable",
    };
  }
  return {
    overall: ai.executiveScore,
    financeiro: moduleScore(ai, "financeiro"),
    comercial: moduleScore(ai, "comercial"),
    operacional: moduleScore(ai, "operacao"),
    crm: moduleScore(ai, "crm"),
    estoque: moduleScore(ai, "estoque"),
    source: "executive-ai",
  };
}

export function scoresFromBusinessHealth(
  bh: BusinessHealthResult | null | undefined,
): ExecutiveNamedScores {
  if (!bh) {
    return {
      overall: null,
      financeiro: null,
      comercial: null,
      operacional: null,
      crm: null,
      estoque: null,
      source: "unavailable",
    };
  }
  return {
    overall: bh.overallScore,
    financeiro: bh.finance.score,
    comercial: bh.commercial.score,
    operacional: bh.operation.score,
    crm: bh.crm.score,
    estoque: bh.inventory.score,
    source: "business-health",
  };
}

/** Preferência: AI canônico; BH só se AI ausente (mesmas faixas). */
export function resolveNamedScores(input: {
  ai?: ExecutiveAiResult | null;
  businessHealth?: BusinessHealthResult | null;
}): ExecutiveNamedScores {
  if (input.ai) return scoresFromExecutiveAi(input.ai);
  if (input.businessHealth) return scoresFromBusinessHealth(input.businessHealth);
  return scoresFromExecutiveAi(null);
}
