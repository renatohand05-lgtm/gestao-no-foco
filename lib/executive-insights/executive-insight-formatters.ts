/**
 * Formatadores de texto executivo — sem inventar números.
 */

import type {
  ExecutiveComposedInsight,
  ExecutiveInsightsSummary,
} from "@/lib/executive-insights/executive-insight-types";

export function buildExecutiveInsightsNarrative(
  parts: ExecutiveInsightsSummary,
): string {
  const sentences = [
    parts.overallState,
    parts.mainDeviation,
    parts.nextAction ?? parts.mainRisk ?? parts.mainOpportunity,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);

  const unique: string[] = [];
  for (const s of sentences) {
    const norm = s.toLowerCase();
    if (unique.some((u) => u.toLowerCase() === norm)) continue;
    unique.push(s);
    if (unique.length >= 3) break;
  }
  return unique.join(" ");
}

export function formatInsightHeadline(insight: ExecutiveComposedInsight): string {
  return insight.title.trim();
}

export function sourceLabel(
  source: ExecutiveComposedInsight["sources"][number],
): string {
  switch (source) {
    case "business_intelligence":
      return "Business Intelligence";
    case "executive_intelligence":
      return "Executive Intelligence";
    case "prediction":
      return "Prediction";
    case "action_center":
      return "Action Center";
    case "commercial_panel":
      return "Painel comercial";
    case "dashboard":
      return "Dashboard";
    default:
      return source;
  }
}
