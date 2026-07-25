/**
 * Predictive Intelligence — tipos (Gate 20.4).
 * Previsões locais · sem LLM · sem inventar números.
 */

export type PredictiveConfidence = "alta" | "media" | "baixa";

export type PredictiveTrend =
  | "alta"
  | "estavel"
  | "queda"
  | "indisponivel";

export type PredictiveRiskLevel =
  | "baixo"
  | "moderado"
  | "alto"
  | "critico"
  | "indisponivel";

export type PredictiveDomain =
  | "faturamento"
  | "fluxo_caixa"
  | "estoque"
  | "metas"
  | "risco_operacional";

export type PredictiveEvidence = {
  id: string;
  label: string;
  value: string;
  source: string;
};

export type PredictiveForecast = {
  domain: PredictiveDomain;
  title: string;
  /** Texto curto da previsão (valores só se existirem na fonte). */
  headline: string;
  /** Valor principal formatado ou "Indisponível". */
  primaryValue: string;
  /** Contexto / horizonte (ex.: 7 dias). */
  horizon: string;
  confidence: PredictiveConfidence;
  confidenceLabel: string;
  trend: PredictiveTrend;
  trendLabel: string;
  risk: PredictiveRiskLevel;
  riskLabel: string;
  evidence: PredictiveEvidence[];
  unavailableReason: string | null;
  href?: string;
};

export type PredictiveIntelligenceResult = {
  forecasts: PredictiveForecast[];
  overallConfidence: PredictiveConfidence;
  overallConfidenceLabel: string;
  summary: string;
  warnings: string[];
  generatedAt: string;
  engineVersion: string;
  tenantSlug: string;
};

export const PREDICTIVE_ENGINE_VERSION = "20.4.0";

export const PREDICTIVE_CONFIDENCE_LABEL: Record<PredictiveConfidence, string> =
  {
    alta: "Alta",
    media: "Média",
    baixa: "Baixa",
  };

export const PREDICTIVE_TREND_LABEL: Record<PredictiveTrend, string> = {
  alta: "Alta",
  estavel: "Estável",
  queda: "Queda",
  indisponivel: "Indisponível",
};

export const PREDICTIVE_RISK_LABEL: Record<PredictiveRiskLevel, string> = {
  baixo: "Baixo",
  moderado: "Moderado",
  alto: "Alto",
  critico: "Crítico",
  indisponivel: "Indisponível",
};

export const PREDICTIVE_DOMAIN_TITLE: Record<PredictiveDomain, string> = {
  faturamento: "Faturamento",
  fluxo_caixa: "Fluxo de caixa",
  estoque: "Estoque",
  metas: "Metas",
  risco_operacional: "Risco operacional",
};
