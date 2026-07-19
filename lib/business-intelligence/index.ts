/**
 * Business Intelligence Engine — Sprint 11.2
 * Camada desacoplada da UI. Sem I/O.
 */

export {
  buildBusinessIntelligence,
  buildBusinessSummary,
  buildBusinessCause,
  buildBusinessRisks,
  buildBusinessOpportunities,
  buildBusinessPriorities,
  buildBusinessKpiExplanations,
  buildMonthOverMonthComparator,
  listComparatorDimensions,
} from "@/lib/business-intelligence/business-diagnosis";

export type {
  BusinessIntelligenceResult,
  BusinessSummary,
  BusinessCause,
  BusinessRisk,
  BusinessOpportunity,
  BusinessPriority,
  BusinessKpiExplanation,
  BusinessComparatorSnapshot,
  BusinessComparatorDimension,
  BusinessStatus,
  BusinessPriorityLevel,
  BusinessRiskSeverity,
} from "@/lib/business-intelligence/types";
