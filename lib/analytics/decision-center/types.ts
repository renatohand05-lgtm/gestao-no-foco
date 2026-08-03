/**
 * Sprint 30.6 — DTOs Decision Center / Executive Intelligence (Analytics).
 * Apresentação determinística — sem IA generativa.
 */

export type KpiHealthLevel = "excelente" | "bom" | "atencao" | "critico";

export type TrendDirection = "up" | "down" | "flat" | "unknown";

export type DecisionPriority = "critica" | "alta" | "media" | "baixa";

export type ExecutiveSignalCard = {
  id: string;
  label: string;
  metricId: string | null;
  metricName: string | null;
  valueLabel: string;
  deltaPercent: number | null;
  direction: TrendDirection;
  evidence: string;
  href: string | null;
};

export type ExecutiveIntelligenceBrief = {
  improved: ExecutiveSignalCard[];
  worsened: ExecutiveSignalCard[];
  biggestGrowth: ExecutiveSignalCard | null;
  biggestDrop: ExecutiveSignalCard | null;
  biggestRisk: ExecutiveSignalCard | null;
  biggestOpportunity: ExecutiveSignalCard | null;
  mostCritical: ExecutiveSignalCard | null;
  healthiest: ExecutiveSignalCard | null;
  nextAction: {
    title: string;
    reason: string;
    href: string;
    priority: DecisionPriority;
  } | null;
  empty: boolean;
};

export type TrendPeriodRow = {
  periodId: string;
  periodLabel: string;
  metricId: string;
  metricName: string;
  value: number | null;
  previous: number | null;
  delta: number | null;
  deltaPercent: number | null;
  direction: TrendDirection;
  evidence: string;
};

export type BusinessInsightCard = {
  id: string;
  title: string;
  ruleId: string;
  evidence: string;
  impactLabel: string | null;
  tone: "positive" | "negative" | "warning" | "neutral";
  href: string | null;
};

export type ForecastItem = {
  id: string;
  label: string;
  projected: number | null;
  formatted: string;
  methodology: string;
  confidence: string;
  limitations: string[];
  scenario: "conservative" | "base" | "optimistic";
};

export type DecisionItem = {
  id: string;
  problem: string;
  impact: string;
  evidence: string;
  recommendation: string;
  priority: DecisionPriority;
  href: string;
  category: string;
};

export type KpiHealthItem = {
  metricId: string;
  name: string;
  level: KpiHealthLevel;
  reason: string;
  trend: TrendDirection;
  deltaPercent: number | null;
  formatted: string;
  historyHint: string;
};

export type ComparativeRow = {
  dimension: string;
  label: string;
  receita: number | null;
  lucro: number | null;
  conversao: number | null;
  ticket: number | null;
  pipeline: number | null;
  caixa: number | null;
  evidence: string;
};

export type EnrichedExecutiveAlert = {
  id: string;
  title: string;
  description: string;
  severity: string;
  financialImpact: number | null;
  gravity: "baixa" | "media" | "alta" | "critica";
  urgency: "baixa" | "media" | "alta" | "imediata";
  category: string;
  responsible: string | null;
  deadline: string | null;
  recommendation: string;
  href: string;
};

export type ExecutiveReportDoc = {
  title: string;
  generatedAt: string;
  periodLabel: string;
  summary: string;
  positives: string[];
  criticals: string[];
  actions: string[];
  risks: string[];
  opportunities: string[];
  markdown: string;
};

export type DecisionCenterPack = {
  brief: ExecutiveIntelligenceBrief;
  trends: TrendPeriodRow[];
  insights: BusinessInsightCard[];
  forecast: ForecastItem[];
  decisions: DecisionItem[];
  kpiHealth: KpiHealthItem[];
  comparatives: ComparativeRow[];
  alerts: EnrichedExecutiveAlert[];
  report: ExecutiveReportDoc;
  generatedAt: string;
};
