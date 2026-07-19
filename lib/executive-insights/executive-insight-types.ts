/**
 * Executive Insights — tipos (Sprint 13.14).
 * Camada de apresentação determinística · sem I/O · sem recálculo financeiro.
 */

export type ExecutiveInsightType =
  | "critical"
  | "warning"
  | "opportunity"
  | "positive"
  | "informational";

export type ExecutiveInsightCategory =
  | "vendas"
  | "metas"
  | "receita"
  | "projecao"
  | "ritmo"
  | "ticket"
  | "financeiro"
  | "operacao"
  | "geral";

export type ExecutiveInsightSeverity = "critical" | "high" | "medium" | "low";

export type ExecutiveInsightConfidence = "baixa" | "media" | "alta";

export type ExecutiveInsightSource =
  | "business_intelligence"
  | "executive_intelligence"
  | "prediction"
  | "action_center"
  | "commercial_panel"
  | "dashboard";

export type ExecutiveInsightStatus =
  | "active"
  | "informational"
  | "insufficient_data"
  | "neutral";

export type ExecutiveInsightMetricRef = {
  label: string;
  value: string;
};

export type ExecutiveComposedInsight = {
  id: string;
  type: ExecutiveInsightType;
  category: ExecutiveInsightCategory;
  priority: number;
  severity: ExecutiveInsightSeverity;
  title: string;
  summary: string;
  evidence: string | null;
  impact: string | null;
  recommendation: string | null;
  cta: { label: string; href: string } | null;
  confidence: ExecutiveInsightConfidence;
  confidenceReason: string;
  sources: ExecutiveInsightSource[];
  ruleId: string;
  periodLabel: string | null;
  relatedMetrics: ExecutiveInsightMetricRef[];
  horizon: string | null;
  status: ExecutiveInsightStatus;
  referenceDate: string | null;
  /** Chave semântica para deduplicação */
  themeKey: string;
};

export type ExecutiveInsightsSummary = {
  overallState: string;
  mainDeviation: string | null;
  mainRisk: string | null;
  mainOpportunity: string | null;
  nextAction: string | null;
  /** 2–3 frases prontas para UI */
  narrative: string;
};

export type ExecutiveInsightsPack = {
  summary: ExecutiveInsightsSummary;
  primary: ExecutiveComposedInsight | null;
  risks: ExecutiveComposedInsight[];
  opportunities: ExecutiveComposedInsight[];
  positives: ExecutiveComposedInsight[];
  informational: ExecutiveComposedInsight[];
  /** Tudo após o top, para progressive disclosure */
  more: ExecutiveComposedInsight[];
  all: ExecutiveComposedInsight[];
  periodLabel: string | null;
  confidence: ExecutiveInsightConfidence;
  confidenceReason: string;
};
