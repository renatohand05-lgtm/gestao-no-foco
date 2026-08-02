/**
 * Blueprints de recomendação — normaliza ações já existentes (Sprint 29.4).
 */

import type { ExecutiveAiResult } from "../ai/executive-ai-types.ts";
import type { BusinessHealthResult } from "../dashboard/business-health-engine.ts";
import type { InsightDomain, RecommendationBlueprint } from "./types.ts";

function mapModuleToDomain(module: string | null): InsightDomain {
  switch (module) {
    case "financeiro":
      return "financeiro";
    case "comercial":
      return "comercial";
    case "crm":
      return "crm";
    case "operacao":
      return "operacao";
    case "estoque":
      return "estoque";
    default:
      return "dashboard";
  }
}

export function recommendationsFromExecutiveAi(
  ai: ExecutiveAiResult | null | undefined,
): RecommendationBlueprint[] {
  if (!ai?.recommendations?.length) return [];
  return ai.recommendations.map((a) => ({
    id: `ai.rec.${a.id}`,
    domain: mapModuleToDomain(a.module),
    title: a.title,
    reason: a.reason || a.action,
    href: a.href,
    priority: a.priority,
    sourceEngine: "executive-ai",
  }));
}

export function recommendationsFromBusinessHealth(
  bh: BusinessHealthResult | null | undefined,
): RecommendationBlueprint[] {
  if (!bh?.priorities?.length) return [];
  return bh.priorities.map((a) => ({
    id: `bh.priority.${a.id}`,
    domain: mapModuleToDomain(a.module),
    title: a.title,
    reason: a.reason,
    href: a.href,
    priority: 100 - a.rank,
    sourceEngine: "business-health",
  }));
}

export function mergeRecommendationBlueprints(
  lists: RecommendationBlueprint[][],
): RecommendationBlueprint[] {
  const seen = new Set<string>();
  const out: RecommendationBlueprint[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = `${item.title}|${item.href ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out.sort((a, b) => b.priority - a.priority);
}
