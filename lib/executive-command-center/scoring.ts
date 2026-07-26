/**
 * Scoring do Command Center (Gate 20.7).
 * Reutiliza Executive Score do Decision Center / IA · sem fórmula paralela.
 */

import type { ExecutiveAiResult } from "../ai/executive-ai-types.ts";
import type { EdcExecutiveScore } from "../executive-decision-center/types.ts";
import type { EccConfidence, EccExecutiveScore } from "./types.ts";

function mapConf(c: EdcExecutiveScore["confidence"] | number): EccConfidence {
  if (typeof c === "number") {
    if (c >= 75) return "alta";
    if (c >= 50) return "media";
    return "baixa";
  }
  return c;
}

/**
 * Preferência: Executive Score da IA (Gate 18.5) — alinhado ao Hero/EIC.
 * Fallback: score do Decision Center (20.6).
 */
export function resolveCommandExecutiveScore(params: {
  edcScore: EdcExecutiveScore;
  ai: ExecutiveAiResult;
}): EccExecutiveScore {
  const { edcScore, ai } = params;

  if (ai.executiveScore != null) {
    const value = Math.round(ai.executiveScore);
    const label =
      ai.health === "excelente"
        ? "Saudável"
        : ai.health === "saudavel"
          ? "Saudável"
          : ai.health === "atencao"
            ? "Atenção"
            : ai.health === "critico"
              ? "Crítico"
              : "Indisponível";
    return {
      value,
      label,
      confidence: mapConf(ai.confidence),
      healthLabel:
        ai.health === "indisponivel" ? "Indisponível" : label,
      source: "decision-engine",
    };
  }

  if (edcScore.value != null) {
    return {
      value: edcScore.value,
      label: edcScore.label,
      confidence: mapConf(edcScore.confidence),
      healthLabel: edcScore.label,
      source: "executive-decision-center",
    };
  }

  return {
    value: null,
    label: "Indisponível",
    confidence: "baixa",
    healthLabel: "Indisponível",
    source: "unavailable",
  };
}
