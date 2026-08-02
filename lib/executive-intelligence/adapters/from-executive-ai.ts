/**
 * Diagnósticos Executive AI → blueprints por domínio (Sprint 29.4).
 * Sem novo cálculo — só reetiqueta evidências existentes.
 */

import type { ExecutiveAiResult } from "../../ai/executive-ai-types.ts";
import type { InsightDomain, RecommendationBlueprint } from "../types.ts";

function moduleToDomain(module: string): InsightDomain {
  switch (module) {
    case "financeiro":
      return "financeiro";
    case "comercial":
      return "comercial";
    case "crm":
      return "crm";
    case "operacao":
      return "ordens";
    case "estoque":
      return "estoque";
    default:
      return "dashboard";
  }
}

/** Recomendações por domínio a partir de diagnósticos críticos/altos. */
export function domainRecommendationsFromDiagnostics(
  ai: ExecutiveAiResult | null | undefined,
): RecommendationBlueprint[] {
  if (!ai?.diagnostics?.length) return [];
  return ai.diagnostics
    .filter((d) => d.severity === "critica" || d.severity === "alta")
    .map((d, i) => ({
      id: `ai.diag.${d.id}`,
      domain: moduleToDomain(d.module),
      title: d.title,
      reason: d.description,
      href: d.href,
      priority: d.severity === "critica" ? 100 - i : 80 - i,
      sourceEngine: "executive-ai-diagnostics",
    }));
}
