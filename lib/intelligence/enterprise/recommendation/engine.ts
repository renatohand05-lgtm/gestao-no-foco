/**
 * Fase 27 — Recommendation + Action Plan engines (rascunhos).
 */

import { computeConfidence } from "../confidence/engine.ts";
import { getEvidenceByIds } from "../evidence/registry.ts";
import type {
  ActionPlan,
  Insight,
  Recommendation,
} from "../types.ts";
import { randomUUID } from "node:crypto";

export function recommendationsFromInsights(
  insights: Insight[],
  _createdBy: string,
): Recommendation[] {
  return insights
    .filter((i) => i.type === "risco" || i.type === "estoque" || i.type === "cliente")
    .slice(0, 5)
    .map((i) => {
      const evidence = getEvidenceByIds(i.evidenceIds);
      const confidence =
        i.confidence ??
        computeConfidence({ evidence, missingSources: [] });
      return {
        id: randomUUID(),
        title: `Ação: ${i.title}`,
        summary: i.summary,
        rationale: `Derivado do insight ${i.id} com evidências ${i.evidenceIds.join(",")}.`,
        priority:
          i.severity === "critica"
            ? "critica"
            : i.severity === "alta"
              ? "alta"
              : "media",
        impact: i.impact,
        effort: "medio",
        urgency: i.severity === "critica" ? "imediata" : "curto_prazo",
        confidence,
        sourceEvidenceIds: i.evidenceIds,
        module: i.module,
        deepLink: i.deepLink,
        actionType: "review",
        requiresApproval: true,
      } satisfies Recommendation;
    });
}

export function draftActionPlanFromRecommendations(
  recs: Recommendation[],
  createdBy: string,
  objective: string,
): ActionPlan | null {
  if (recs.length === 0) return null;
  const evidenceIds = [...new Set(recs.flatMap((r) => r.sourceEvidenceIds))];
  const evidence = getEvidenceByIds(evidenceIds);
  const confidence = computeConfidence({ evidence });
  return {
    id: randomUUID(),
    objective,
    steps: recs.map((r, idx) => ({
      id: randomUUID(),
      title: r.title,
      description: r.summary,
      order: idx + 1,
      status: "pending" as const,
    })),
    responsibleRole: recs[0]?.module,
    priority: recs[0]?.priority ?? "media",
    status: "draft",
    evidence: evidenceIds,
    expectedImpact: "Estimativa somente com base nas evidências listadas.",
    confidence,
    createdBy,
    executedAt: null,
  };
}
