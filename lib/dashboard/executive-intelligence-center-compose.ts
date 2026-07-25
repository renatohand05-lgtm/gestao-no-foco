/**
 * Centro de Inteligência Operacional — composição pura (Gate 20.1).
 * Consolida Decision Engine (18.5) + Decision Center (16.2).
 * Mesmo input → mesmo output. Sem I/O · sem mocks · sem inventar números.
 */

import { EXECUTIVE_AI_RULE_VERSION } from "../ai/executive-ai-types.ts";
import type { ExecutiveAiResult } from "../ai/executive-ai-types.ts";
import type { ExecutiveDecisionResult } from "./executive-decision-types.ts";
import {
  EIC_MAX_OPORTUNIDADES,
  EIC_MAX_PRIORIDADES,
  EIC_MAX_RECOMENDACOES,
  EIC_MAX_RISCOS,
  type EicOpportunityItem,
  type EicPriorityItem,
  type EicRecommendationItem,
  type EicRiskItem,
  type ExecutiveIntelligenceCenterData,
} from "./executive-intelligence-center-types.ts";

function money(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function impactFromDecisionValue(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value === 0) return null;
  return money(Math.abs(value));
}

function impactFromScoreDelta(delta: number): string | null {
  if (!Number.isFinite(delta) || delta === 0) return null;
  const n = Math.round(Math.abs(delta));
  return delta < 0 ? `−${n} pts no score` : `+${n} pts no score`;
}

/**
 * Projeta o Executive Score + painéis Prioridades / Oportunidades / Riscos / Recomendações.
 */
export function composeExecutiveIntelligenceCenter(input: {
  ai: ExecutiveAiResult;
  decision?: ExecutiveDecisionResult | null;
}): ExecutiveIntelligenceCenterData {
  const { ai, decision } = input;

  const recomendacoes: EicRecommendationItem[] = ai.recommendations
    .slice(0, EIC_MAX_RECOMENDACOES)
    .map((r) => ({
      id: r.id,
      title: r.title,
      action: r.action,
      reason: r.reason,
      expectedImpact: r.expectedImpact,
      href: r.href,
      priority: r.priority,
      module: r.module,
      source: "decision-engine" as const,
    }));

  const prioridades: EicPriorityItem[] = [];
  const seenPriority = new Set<string>();

  for (const r of ai.recommendations) {
    if (prioridades.length >= EIC_MAX_PRIORIDADES) break;
    const key = r.id;
    if (seenPriority.has(key)) continue;
    seenPriority.add(key);
    prioridades.push({
      id: `prio.${r.id}`,
      title: r.action || r.title,
      reason: r.reason,
      impactRank: 1000 - r.priority * 10,
      module: r.module,
      href: r.href,
      source: "decision-engine",
    });
  }

  if (ai.priority.diagnosticId && prioridades.length < EIC_MAX_PRIORIDADES) {
    const key = `prio.headline.${ai.priority.diagnosticId}`;
    if (!seenPriority.has(ai.priority.diagnosticId)) {
      seenPriority.add(ai.priority.diagnosticId);
      prioridades.unshift({
        id: key,
        title: ai.priority.title,
        reason: ai.priority.reason,
        impactRank: 2000,
        module: ai.priority.module,
        href: ai.priority.href,
        source: "decision-engine",
      });
    }
  }

  if (decision?.items?.length) {
    const critical = decision.items
      .filter((i) => i.severity === "critical")
      .sort((a, b) => b.score - a.score);
    for (const item of critical) {
      if (prioridades.length >= EIC_MAX_PRIORIDADES) break;
      if (seenPriority.has(item.id)) continue;
      seenPriority.add(item.id);
      prioridades.push({
        id: `prio.dec.${item.id}`,
        title: item.title,
        reason: item.description,
        impactRank: item.score,
        module: item.category,
        href: item.href,
        source: "decision-center",
      });
    }
  }

  prioridades.sort((a, b) => {
    if (b.impactRank !== a.impactRank) return b.impactRank - a.impactRank;
    return a.id.localeCompare(b.id);
  });

  const oportunidades: EicOpportunityItem[] = [];
  const seenOpp = new Set<string>();

  for (const d of ai.diagnostics) {
    if (d.severity !== "oportunidade") continue;
    if (oportunidades.length >= EIC_MAX_OPORTUNIDADES) break;
    if (seenOpp.has(d.id)) continue;
    seenOpp.add(d.id);
    oportunidades.push({
      id: `opp.${d.id}`,
      title: d.title,
      description: d.description,
      potentialGainLabel: impactFromScoreDelta(d.scoreImpact),
      module: d.module,
      href: d.href,
      source: "decision-engine",
    });
  }

  for (const r of ai.recommendations) {
    if (!r.expectedImpact) continue;
    if (oportunidades.length >= EIC_MAX_OPORTUNIDADES) break;
    if (seenOpp.has(r.id)) continue;
    // Só recomendações com ganho explícito entram como oportunidade financeira
    if (!/R\$|receita|ganho|liberar|recuper/i.test(r.expectedImpact)) continue;
    seenOpp.add(r.id);
    oportunidades.push({
      id: `opp.rec.${r.id}`,
      title: r.title,
      description: r.action,
      potentialGainLabel: r.expectedImpact,
      module: r.module,
      href: r.href,
      source: "decision-engine",
    });
  }

  if (decision?.items?.length) {
    const opps = decision.items
      .filter((i) => i.severity === "opportunity")
      .sort((a, b) => b.score - a.score);
    for (const item of opps) {
      if (oportunidades.length >= EIC_MAX_OPORTUNIDADES) break;
      if (seenOpp.has(item.id)) continue;
      seenOpp.add(item.id);
      oportunidades.push({
        id: `opp.dec.${item.id}`,
        title: item.title,
        description: item.description,
        potentialGainLabel: impactFromDecisionValue(item.impactValue),
        module: item.category,
        href: item.href,
        source: "decision-center",
      });
    }
  }

  const riscos: EicRiskItem[] = [];
  const seenRisk = new Set<string>();

  for (const d of ai.diagnostics) {
    if (d.severity !== "critica" && d.severity !== "alta" && d.severity !== "media") {
      continue;
    }
    if (riscos.length >= EIC_MAX_RISCOS) break;
    if (seenRisk.has(d.id)) continue;
    seenRisk.add(d.id);
    riscos.push({
      id: `risk.${d.id}`,
      title: d.title,
      description: d.description,
      criticidade:
        d.severity === "critica"
          ? "critica"
          : d.severity === "alta"
            ? "alta"
            : "media",
      impactLabel: impactFromScoreDelta(d.scoreImpact),
      module: d.module,
      href: d.href,
      source: "decision-engine",
    });
  }

  if (decision?.items?.length) {
    const risky = decision.items
      .filter((i) => i.severity === "critical" || i.severity === "warning")
      .sort((a, b) => b.score - a.score);
    for (const item of risky) {
      if (riscos.length >= EIC_MAX_RISCOS) break;
      if (seenRisk.has(item.id)) continue;
      seenRisk.add(item.id);
      riscos.push({
        id: `risk.dec.${item.id}`,
        title: item.title,
        description: item.description,
        criticidade: item.severity === "critical" ? "critica" : "alta",
        impactLabel: impactFromDecisionValue(item.impactValue),
        module: item.category,
        href: item.href,
        source: "decision-center",
      });
    }
  }

  riscos.sort((a, b) => {
    const rank = { critica: 3, alta: 2, media: 1 };
    const d = rank[b.criticidade] - rank[a.criticidade];
    if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  });

  return {
    score: {
      value: ai.executiveScore,
      health: ai.health,
      confidence: ai.confidence,
      partial: ai.partial,
      modules: ai.moduleScores,
      unavailableSources: ai.unavailableSources,
    },
    prioridades: prioridades.slice(0, EIC_MAX_PRIORIDADES),
    oportunidades: oportunidades.slice(0, EIC_MAX_OPORTUNIDADES),
    riscos: riscos.slice(0, EIC_MAX_RISCOS),
    recomendacoes,
    generatedAt: ai.generatedAt,
    engineVersion: EXECUTIVE_AI_RULE_VERSION,
    priorityHeadline: {
      title: ai.priority.title,
      reason: ai.priority.reason,
      href: ai.priority.href,
    },
  };
}
