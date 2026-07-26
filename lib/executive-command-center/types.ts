/**
 * Executive Command Center — tipos (Gate 20.7).
 * Agrega engines 20.1–20.6 · sem LLM · sem inventar métricas.
 */

export type EccPriorityLevel = "critical" | "high" | "medium" | "low";

export type EccConfidence = "alta" | "media" | "baixa";

export type EccUrgency = "imediata" | "alta" | "media" | "baixa";

export type EccAlertKind =
  | "critical"
  | "finance"
  | "operations"
  | "commercial"
  | "inventory";

export type EccOpportunityKind =
  | "quick_win"
  | "savings"
  | "revenue"
  | "loss_reduction";

export type EccActionStatus = "pendente" | "sugerida" | "monitorar";

export type EccKpiKey =
  | "receita_prevista"
  | "lucro_previsto"
  | "fluxo_previsto"
  | "margem"
  | "ticket_medio"
  | "conversao"
  | "estoque_saudavel"
  | "os_atraso"
  | "meta";

export type EccEvidence = {
  id: string;
  label: string;
  value: string;
  source: string;
};

export type EccPriorityItem = {
  id: string;
  title: string;
  description: string;
  priority: EccPriorityLevel;
  impact: number;
  confidence: EccConfidence;
  source: string;
  href?: string;
};

export type EccRiskItem = {
  id: string;
  title: string;
  description: string;
  priority: EccPriorityLevel;
  impactLabel: string | null;
  confidence: EccConfidence;
  source: string;
  category: string;
  href?: string;
};

export type EccOpportunityItem = {
  id: string;
  title: string;
  description: string;
  kind: EccOpportunityKind;
  potentialGainLabel: string | null;
  confidence: EccConfidence;
  source: string;
  href?: string;
};

export type EccAlertItem = {
  id: string;
  title: string;
  description: string;
  kind: EccAlertKind;
  priority: EccPriorityLevel;
  source: string;
  href?: string;
};

export type EccActionItem = {
  id: string;
  title: string;
  description: string;
  financialImpactLabel: string | null;
  priority: EccPriorityLevel;
  urgency: EccUrgency;
  confidence: EccConfidence;
  source: string;
  category: string;
  /** Área funcional responsável (não pessoa). */
  owner: string;
  status: EccActionStatus;
  href?: string;
};

export type EccKpiItem = {
  key: EccKpiKey;
  label: string;
  value: string;
  hint: string | null;
  available: boolean;
  tone: "success" | "warning" | "danger" | "neutral" | "info";
};

export type EccForecastSlice = {
  id: string;
  title: string;
  headline: string;
  primaryValue: string;
  horizon: string;
  confidence: EccConfidence;
  riskLabel: string;
  available: boolean;
  unavailableReason: string | null;
};

export type EccGoalsSlice = {
  metaMesLabel: string;
  percentualLabel: string;
  projecaoLabel: string;
  abaixoRitmo: boolean | null;
  available: boolean;
};

export type EccMorningBrief = {
  greetingLine: string;
  paragraphs: string[];
  fullText: string;
};

export type EccExecutiveScore = {
  value: number | null;
  label: string;
  confidence: EccConfidence;
  healthLabel: string;
  source: string;
};

export type EccResult = {
  score: EccExecutiveScore;
  morningBrief: EccMorningBrief;
  priorities: EccPriorityItem[];
  risks: EccRiskItem[];
  opportunities: EccOpportunityItem[];
  quickWins: EccOpportunityItem[];
  alerts: EccAlertItem[];
  actions: EccActionItem[];
  kpis: EccKpiItem[];
  cashflowForecast: EccForecastSlice | null;
  financialForecast: EccForecastSlice | null;
  operationalForecast: EccForecastSlice | null;
  goals: EccGoalsSlice;
  pendingDecisionsCount: number;
  criticalDecisionsCount: number;
  summaryLine: string;
  generatedAt: string;
  engineVersion: string;
  tenantSlug: string;
};

export const ECC_ENGINE_VERSION = "20.7.1";
export const ECC_TOP_N = 5;

/** Label elegante para KPI sem fonte no ciclo atual. */
export const ECC_UNAVAILABLE_LABEL = "Dados ainda não disponíveis neste ciclo";
export const ECC_UNAVAILABLE_DRE_HINT =
  "Aguardando integração com o DRE neste snapshot";

export const ECC_KPI_LABEL: Record<EccKpiKey, string> = {
  receita_prevista: "Receita prevista",
  lucro_previsto: "Lucro previsto",
  fluxo_previsto: "Fluxo previsto",
  margem: "Margem",
  ticket_medio: "Ticket médio",
  conversao: "Conversão",
  estoque_saudavel: "Estoque saudável",
  os_atraso: "OS em atraso",
  meta: "Meta",
};

export const ECC_ALERT_KIND_LABEL: Record<EccAlertKind, string> = {
  critical: "Críticos",
  finance: "Financeiros",
  operations: "Operacionais",
  commercial: "Comerciais",
  inventory: "Estoque",
};

export const ECC_OPPORTUNITY_KIND_LABEL: Record<EccOpportunityKind, string> = {
  quick_win: "Ganhos rápidos",
  savings: "Economias",
  revenue: "Receitas potenciais",
  loss_reduction: "Redução de perdas",
};

export const ECC_PRIORITY_LABEL: Record<EccPriorityLevel, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};
