import { buildBusinessCause } from "@/lib/business-intelligence/business-causes";
import { buildBusinessOpportunities } from "@/lib/business-intelligence/business-opportunities";
import { buildBusinessPriorities } from "@/lib/business-intelligence/business-priorities";
import { buildBusinessRisks } from "@/lib/business-intelligence/business-risks";
import { buildBusinessSummary } from "@/lib/business-intelligence/business-summary";
import { buildMonthOverMonthComparator } from "@/lib/business-intelligence/comparators";
import { buildBusinessKpiExplanations } from "@/lib/business-intelligence/kpi-explanations";
import type { BusinessIntelligenceResult } from "@/lib/business-intelligence/types";
import {
  buildExecutiveAction,
  toExecutiveIntelligenceInput,
} from "@/lib/intelligence";
import type { CommercialPanelData } from "@/types/commercial-panel";

/**
 * Orquestra o Business Intelligence Engine (Sprint 11.2).
 * Consome apenas o painel já carregado — zero fetch.
 */
export function buildBusinessIntelligence(
  panel: CommercialPanelData,
  tenantSlug: string,
): BusinessIntelligenceResult {
  const input = toExecutiveIntelligenceInput(panel, tenantSlug);
  const action = buildExecutiveAction(input);
  const risks = buildBusinessRisks(input);
  const opportunities = buildBusinessOpportunities(input, panel);

  return {
    summary: buildBusinessSummary(input),
    cause: buildBusinessCause(input),
    risks,
    opportunities,
    priorities: buildBusinessPriorities({
      action,
      risks,
      opportunities,
      intelligenceInput: input,
    }),
    kpiExplanations: buildBusinessKpiExplanations(),
    comparator: buildMonthOverMonthComparator(input),
  };
}

export { buildBusinessSummary } from "@/lib/business-intelligence/business-summary";
export { buildBusinessCause } from "@/lib/business-intelligence/business-causes";
export { buildBusinessRisks } from "@/lib/business-intelligence/business-risks";
export { buildBusinessOpportunities } from "@/lib/business-intelligence/business-opportunities";
export { buildBusinessPriorities } from "@/lib/business-intelligence/business-priorities";
export { buildBusinessKpiExplanations } from "@/lib/business-intelligence/kpi-explanations";
export {
  buildMonthOverMonthComparator,
  listComparatorDimensions,
} from "@/lib/business-intelligence/comparators";
export type {
  BusinessIntelligenceResult,
  BusinessSummary,
  BusinessCause,
  BusinessRisk,
  BusinessOpportunity,
  BusinessPriority,
  BusinessKpiExplanation,
  BusinessComparatorSnapshot,
} from "@/lib/business-intelligence/types";
