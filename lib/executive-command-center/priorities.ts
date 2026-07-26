/**
 * Prioridades do Command Center (Gate 20.7).
 * Deriva de EIC + fila do Decision Center · sem regras novas.
 */

import type { ExecutiveIntelligenceCenterData } from "../dashboard/executive-intelligence-center-types.ts";
import type { EdcDecision, EdcResult } from "../executive-decision-center/types.ts";
import { ECC_TOP_N, type EccPriorityItem, type EccPriorityLevel } from "./types.ts";

function edcPriority(p: EdcDecision["priority"]): EccPriorityLevel {
  return p;
}

export function buildCommandPriorities(params: {
  eic: ExecutiveIntelligenceCenterData;
  edc: EdcResult;
}): EccPriorityItem[] {
  const fromEdc: EccPriorityItem[] = params.edc.queue.slice(0, ECC_TOP_N).map((d) => ({
    id: `prio:edc:${d.id}`,
    title: d.title,
    description: d.description,
    priority: edcPriority(d.priority),
    impact: d.impact,
    confidence: d.confidence,
    source: d.source,
    href: d.href,
  }));

  if (fromEdc.length >= ECC_TOP_N) return fromEdc.slice(0, ECC_TOP_N);

  const seen = new Set(fromEdc.map((p) => p.title.trim().toLowerCase()));
  const fromEic: EccPriorityItem[] = [];

  for (const p of params.eic.prioridades) {
    const key = p.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    fromEic.push({
      id: `prio:eic:${p.id}`,
      title: p.title,
      description: p.reason,
      priority:
        p.impactRank >= 80
          ? "critical"
          : p.impactRank >= 60
            ? "high"
            : p.impactRank >= 40
              ? "medium"
              : "low",
      impact: p.impactRank,
      confidence: p.source === "decision-engine" ? "alta" : "media",
      source: p.source,
      href: p.href,
    });
    if (fromEdc.length + fromEic.length >= ECC_TOP_N) break;
  }

  return [...fromEdc, ...fromEic].slice(0, ECC_TOP_N);
}
