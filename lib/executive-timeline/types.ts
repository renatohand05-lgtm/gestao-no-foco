/**
 * Executive Timeline — tipos (Gate 20.5).
 * Eventos cronológicos derivados de engines existentes · sem LLM.
 */

export type ExecutiveTimelineCategory =
  | "performance"
  | "finance"
  | "cashflow"
  | "sales"
  | "inventory"
  | "operations"
  | "goal"
  | "risk"
  | "forecast"
  | "recommendation"
  | "decision";

export type ExecutiveTimelineSeverity =
  | "info"
  | "positive"
  | "attention"
  | "critical";

export type ExecutiveTimelineConfidence = "alta" | "media" | "baixa";

export type ExecutiveTimelineSort =
  | "recent"
  | "impact"
  | "risk"
  | "confidence";

export type ExecutiveTimelineEvidence = {
  id: string;
  label: string;
  value: string;
  source: string;
};

export type ExecutiveTimelineEvent = {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  category: ExecutiveTimelineCategory;
  severity: ExecutiveTimelineSeverity;
  /** 0–100 · maior = mais impacto (derivado de evidência, não inventado). */
  impact: number;
  evidence: ExecutiveTimelineEvidence[];
  recommendation: string | null;
  source: string;
  confidence: ExecutiveTimelineConfidence;
  /** Score composto para ordenação (severidade + impacto + confiança). */
  priority: number;
  href?: string;
};

export type ExecutiveTimelineGroup = {
  key: string;
  label: string;
  events: ExecutiveTimelineEvent[];
};

export type ExecutiveTimelineResult = {
  events: ExecutiveTimelineEvent[];
  groups: ExecutiveTimelineGroup[];
  total: number;
  generatedAt: string;
  engineVersion: string;
  tenantSlug: string;
};

export const EXECUTIVE_TIMELINE_ENGINE_VERSION = "20.5.0";

export const EXECUTIVE_TIMELINE_CATEGORY_LABEL: Record<
  ExecutiveTimelineCategory,
  string
> = {
  performance: "Performance",
  finance: "Financeiro",
  cashflow: "Fluxo de caixa",
  sales: "Vendas",
  inventory: "Estoque",
  operations: "Operação",
  goal: "Metas",
  risk: "Riscos",
  forecast: "Previsões",
  recommendation: "Recomendações",
  decision: "Decisões",
};

export const EXECUTIVE_TIMELINE_SEVERITY_LABEL: Record<
  ExecutiveTimelineSeverity,
  string
> = {
  info: "Info",
  positive: "Positivo",
  attention: "Atenção",
  critical: "Crítico",
};

export const EXECUTIVE_TIMELINE_CONFIDENCE_LABEL: Record<
  ExecutiveTimelineConfidence,
  string
> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const EXECUTIVE_TIMELINE_MAX_EVENTS = 40;
