/**
 * Oportunidades do Command Center (Gate 20.7).
 * EIC + Quick Wins EDC + simulações disponíveis.
 */

import type { ExecutiveIntelligenceCenterData } from "../dashboard/executive-intelligence-center-types.ts";
import type { EdcResult } from "../executive-decision-center/types.ts";
import {
  ECC_TOP_N,
  type EccOpportunityItem,
  type EccOpportunityKind,
} from "./types.ts";

function kindFromTitle(title: string, fallback: EccOpportunityKind): EccOpportunityKind {
  const t = title.toLowerCase();
  if (/econom|despesa|custo|parado|estoque/.test(t)) return "savings";
  if (/perda|perdido|inadimpl|vencid/.test(t)) return "loss_reduction";
  if (/fatur|receita|ticket|venda|negocia/.test(t)) return "revenue";
  return fallback;
}

export function buildCommandOpportunities(params: {
  eic: ExecutiveIntelligenceCenterData;
  edc: EdcResult;
}): {
  opportunities: EccOpportunityItem[];
  quickWins: EccOpportunityItem[];
} {
  const opportunities: EccOpportunityItem[] = [];
  const seen = new Set<string>();

  const push = (item: EccOpportunityItem) => {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    opportunities.push(item);
  };

  for (const q of params.edc.quickWins) {
    push({
      id: `opp:qw:${q.id}`,
      title: q.title,
      description: q.description,
      kind: "quick_win",
      potentialGainLabel: q.financialImpactLabel,
      confidence: q.confidence,
      source: q.source,
      href: q.href,
    });
  }

  for (const o of params.eic.oportunidades) {
    push({
      id: `opp:eic:${o.id}`,
      title: o.title,
      description: o.description,
      kind: kindFromTitle(o.title, "revenue"),
      potentialGainLabel: o.potentialGainLabel,
      confidence: "media",
      source: o.source,
      href: o.href,
    });
  }

  for (const s of params.edc.simulations) {
    if (!s.available) continue;
    push({
      id: `opp:sim:${s.kind}`,
      title: s.title,
      description: s.description,
      kind: kindFromTitle(s.title, "revenue"),
      potentialGainLabel: s.deltaLabel,
      confidence: s.confidence,
      source: "decision-center-simulation",
    });
  }

  const quickWins = opportunities
    .filter((o) => o.kind === "quick_win")
    .slice(0, ECC_TOP_N);

  return {
    opportunities: opportunities.slice(0, ECC_TOP_N),
    quickWins,
  };
}
