/**
 * Executive Decision Center — tipos (Gate 20.6).
 * Fila de decisões a partir de engines existentes · sem LLM.
 */

export type EdcCategory =
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

export type EdcPriority = "critical" | "high" | "medium" | "low";

export type EdcConfidence = "alta" | "media" | "baixa";

export type EdcEffort = "baixo" | "medio" | "alto";

export type EdcUrgency = "imediata" | "alta" | "media" | "baixa";

export type EdcEvidence = {
  id: string;
  label: string;
  value: string;
  source: string;
};

export type EdcDecision = {
  id: string;
  title: string;
  description: string;
  category: EdcCategory;
  priority: EdcPriority;
  /** 0–100 */
  impact: number;
  urgency: EdcUrgency;
  confidence: EdcConfidence;
  effort: EdcEffort;
  /** Score composto 0–100 para ordenação da fila. */
  score: number;
  recommendation: string;
  evidence: EdcEvidence[];
  source: string;
  suggestedAction: string;
  /** Texto honesto; null se sem fonte confiável. */
  financialImpactLabel: string | null;
  timestamp: string;
  href?: string;
  quickWin: boolean;
};

export type EdcExecutiveScore = {
  value: number | null;
  label: string;
  confidence: EdcConfidence;
  dimensions: Array<{
    key: string;
    label: string;
    score: number | null;
    weight: number;
  }>;
  unavailable: string[];
};

export type EdcSimulationKind =
  | "ticket_medio"
  | "reducao_despesas"
  | "crescimento_faturamento"
  | "antecipacao_recebiveis"
  | "reducao_estoque_parado"
  | "melhoria_margem"
  | "aumento_produtividade";

export type EdcSimulation = {
  id: string;
  kind: EdcSimulationKind;
  title: string;
  description: string;
  /** Percentual aplicado (determinístico, declarado). */
  deltaPct: number;
  baselineLabel: string;
  baselineValue: string;
  projectedLabel: string;
  projectedValue: string;
  deltaLabel: string;
  confidence: EdcConfidence;
  available: boolean;
  unavailableReason: string | null;
  evidence: EdcEvidence[];
};

export type EdcResult = {
  decisions: EdcDecision[];
  queue: EdcDecision[];
  quickWins: EdcDecision[];
  executiveScore: EdcExecutiveScore;
  simulations: EdcSimulation[];
  total: number;
  generatedAt: string;
  engineVersion: string;
  tenantSlug: string;
};

export const EDC_ENGINE_VERSION = "20.6.0";
export const EDC_MAX_DECISIONS = 25;
export const EDC_MAX_QUICK_WINS = 5;
export const EDC_MAX_SIMULATIONS = 7;

export const EDC_CATEGORY_LABEL: Record<EdcCategory, string> = {
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

export const EDC_PRIORITY_LABEL: Record<EdcPriority, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export const EDC_CONFIDENCE_LABEL: Record<EdcConfidence, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const EDC_EFFORT_LABEL: Record<EdcEffort, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

export const EDC_URGENCY_LABEL: Record<EdcUrgency, string> = {
  imediata: "Imediata",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};
