/**
 * Sprint 29.4 — Contratos da camada de Inteligência Executiva.
 * Cálculo de KPIs permanece nos engines canônicos; aqui só sinais / composição / apresentação.
 */

export type InsightDomain =
  | "dashboard"
  | "financeiro"
  | "dre"
  | "fluxo_caixa"
  | "crm"
  | "estoque"
  | "ordens"
  | "comercial"
  | "operacao";

export type TrendDirection =
  | "crescimento"
  | "queda"
  | "estavel"
  | "insuficiente";

export type AnomalyKind = "pico" | "vale" | "desvio" | "nenhuma";

export type SeasonalityHint =
  | "padrao_semanal"
  | "padrao_mensal"
  | "sem_padrao"
  | "insuficiente";

export type SignalSeverity = "info" | "warning" | "danger" | "success";

/** Série numérica já calculada (ex.: faturamento diário). Sem I/O. */
export type MetricSeriesPoint = {
  label: string;
  value: number;
};

export type TrendSignal = {
  id: string;
  domain: InsightDomain;
  kind: "tendencia";
  direction: TrendDirection;
  /** Variação relativa do último vs penúltimo ponto (ou média 1ª vs 2ª metade). */
  changeRatio: number | null;
  title: string;
  summary: string;
  severity: SignalSeverity;
  evidence: string[];
};

export type AnomalySignal = {
  id: string;
  domain: InsightDomain;
  kind: "anomalia";
  anomaly: AnomalyKind;
  title: string;
  summary: string;
  severity: SignalSeverity;
  evidence: string[];
  pointLabel?: string;
  pointValue?: number;
};

export type SeasonalitySignal = {
  id: string;
  domain: InsightDomain;
  kind: "sazonalidade";
  hint: SeasonalityHint;
  title: string;
  summary: string;
  severity: SignalSeverity;
  evidence: string[];
};

export type ExecutiveInsightSignal =
  | TrendSignal
  | AnomalySignal
  | SeasonalitySignal;

/**
 * Scores nomeados — valores herdados de Executive AI / Business Health.
 * NÃO recalcular faixas aqui.
 */
export type ExecutiveNamedScores = {
  overall: number | null;
  financeiro: number | null;
  comercial: number | null;
  operacional: number | null;
  crm: number | null;
  estoque: number | null;
  source: "executive-ai" | "business-health" | "unavailable";
};

export type RecommendationBlueprint = {
  id: string;
  domain: InsightDomain;
  title: string;
  reason: string;
  href?: string;
  priority: number;
  sourceEngine: string;
};

/** Contrato futuro para LLM — Sprint 29.4 só stub determinístico. */
export type ExecutiveAiFutureHookMode =
  | "deterministic"
  | "provider_assisted"
  | "unavailable";

export type ExecutiveAiFutureHook = {
  mode: ExecutiveAiFutureHookMode;
  providerId: string;
  /** Sempre false nesta sprint — sem chamada LLM. */
  llmEnabled: false;
  capabilities: string[];
};

export type ExecutiveIntelligencePack = {
  version: string;
  generatedAt: string;
  scores: ExecutiveNamedScores;
  signals: ExecutiveInsightSignal[];
  recommendations: RecommendationBlueprint[];
  criticalIndicators: Array<{
    id: string;
    label: string;
    severity: SignalSeverity;
    detail: string;
    href?: string;
  }>;
  aiHook: ExecutiveAiFutureHook;
};
