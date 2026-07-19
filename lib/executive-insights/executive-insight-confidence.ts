/**
 * Confiança — espelha faixas já existentes (baixa | média | alta).
 * Não inventa percentual.
 */

import type { ExecutiveInsightConfidence } from "@/lib/executive-insights/executive-insight-types";

const ORDER: Record<ExecutiveInsightConfidence, number> = {
  baixa: 0,
  media: 1,
  alta: 2,
};

export function confidenceRank(c: ExecutiveInsightConfidence): number {
  return ORDER[c];
}

/** Ao consolidar fontes, usa a menor confiança (mais conservador). */
export function mergeConfidence(
  values: ExecutiveInsightConfidence[],
): ExecutiveInsightConfidence {
  if (values.length === 0) return "baixa";
  return values.reduce((min, cur) =>
    confidenceRank(cur) < confidenceRank(min) ? cur : min,
  );
}

export function pickConfidenceReason(
  primary: string | null | undefined,
  fallbacks: Array<string | null | undefined>,
): string {
  const cleaned = [primary, ...fallbacks]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);
  return cleaned[0] ?? "Confiança baseada na disponibilidade de dados do período.";
}

export function forceInformativeWhenLow(
  confidence: ExecutiveInsightConfidence,
  type: "critical" | "warning" | "opportunity" | "positive" | "informational",
): "critical" | "warning" | "opportunity" | "positive" | "informational" {
  if (confidence === "baixa" && (type === "critical" || type === "warning")) {
    return "informational";
  }
  return type;
}
