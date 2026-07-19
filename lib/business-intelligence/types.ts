/**
 * Business Intelligence — tipos (Sprint 11.2)
 */

import type { ExecutiveTone } from "@/lib/intelligence/types";

export type BusinessStatus =
  | "critico"
  | "atencao"
  | "recuperacao"
  | "no_ritmo"
  | "excelente"
  | "sem_meta"
  | "periodo_futuro"
  | "dados_insuficientes";

export type BusinessPriorityLevel = "alta" | "media" | "baixa";

export type BusinessRiskSeverity = "alta" | "media" | "baixa";

export type BusinessSummary = {
  headline: string;
  executiveSummary: string;
  status: BusinessStatus;
  tone: ExecutiveTone;
};

export type BusinessCause = {
  title: string;
  description: string;
  confidence: "baixa" | "media" | "alta";
  supportingMetrics: Array<{ label: string; value: string }>;
};

export type BusinessRisk = {
  id: string;
  severity: BusinessRiskSeverity;
  title: string;
  description: string;
  impact: string;
};

export type BusinessOpportunity = {
  id: string;
  title: string;
  description: string;
  estimatedImpact: string;
};

export type BusinessPriority = {
  id: string;
  priority: BusinessPriorityLevel;
  title: string;
  description: string;
  estimatedImpact: string;
};

/** Explicação executiva de um KPI (tooltip / origem / fatores). */
export type BusinessKpiExplanation = {
  key: string;
  label: string;
  tooltip: string;
  explanation: string;
  origin: string;
  factors: string[];
};

/**
 * Dimensão de comparação futura (arquitetura).
 * Sprint 11.2: implementação efetiva = mês anterior (já no payload).
 */
export type BusinessComparatorDimension =
  | "mes_anterior"
  | "semana"
  | "trimestre"
  | "ano"
  | "centro"
  | "filial";

export type BusinessComparatorSnapshot = {
  dimension: BusinessComparatorDimension;
  label: string;
  available: boolean;
  metrics: Array<{
    key: string;
    label: string;
    current: number | null;
    previous: number | null;
    variationPct: number | null;
  }>;
  note: string;
};

export type BusinessIntelligenceResult = {
  summary: BusinessSummary;
  cause: BusinessCause;
  risks: BusinessRisk[];
  opportunities: BusinessOpportunity[];
  priorities: BusinessPriority[];
  kpiExplanations: BusinessKpiExplanation[];
  comparator: BusinessComparatorSnapshot;
};
