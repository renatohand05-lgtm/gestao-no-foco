/**
 * Riscos do Command Center (Gate 20.7).
 * EIC riscos + Decision Center críticos + Predictive alto/crítico.
 */

import type { ExecutiveIntelligenceCenterData } from "../dashboard/executive-intelligence-center-types.ts";
import type { EdcResult } from "../executive-decision-center/types.ts";
import type { PredictiveIntelligenceResult } from "../predictive/types.ts";
import {
  ECC_TOP_N,
  type EccPriorityLevel,
  type EccRiskItem,
} from "./types.ts";

function criticidadeToPriority(
  c: "critica" | "alta" | "media",
): EccPriorityLevel {
  if (c === "critica") return "critical";
  if (c === "alta") return "high";
  return "medium";
}

export function buildCommandRisks(params: {
  eic: ExecutiveIntelligenceCenterData;
  edc: EdcResult;
  predictive: PredictiveIntelligenceResult;
}): EccRiskItem[] {
  const out: EccRiskItem[] = [];
  const seen = new Set<string>();

  const push = (item: EccRiskItem) => {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  };

  for (const r of params.eic.riscos) {
    push({
      id: `risk:eic:${r.id}`,
      title: r.title,
      description: r.description,
      priority: criticidadeToPriority(r.criticidade),
      impactLabel: r.impactLabel,
      confidence: "media",
      source: r.source,
      category: String(r.module ?? "geral"),
      href: r.href,
    });
  }

  for (const d of params.edc.queue) {
    if (d.priority !== "critical" && d.category !== "risk") continue;
    push({
      id: `risk:edc:${d.id}`,
      title: d.title,
      description: d.description,
      priority: d.priority,
      impactLabel: d.financialImpactLabel,
      confidence: d.confidence,
      source: d.source,
      category: d.category,
      href: d.href,
    });
  }

  for (const f of params.predictive.forecasts) {
    if (f.risk !== "alto" && f.risk !== "critico") continue;
    push({
      id: `risk:pred:${f.domain}`,
      title: `Risco preditivo · ${f.title}`,
      description: f.headline,
      priority: f.risk === "critico" ? "critical" : "high",
      impactLabel: f.primaryValue !== "Indisponível" ? f.primaryValue : null,
      confidence: f.confidence,
      source: "predictive-intelligence",
      category: f.domain,
      href: f.href,
    });
  }

  const rank: Record<EccPriorityLevel, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return out
    .sort((a, b) => rank[b.priority] - rank[a.priority])
    .slice(0, ECC_TOP_N);
}
