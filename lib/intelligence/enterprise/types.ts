/**
 * Fase 27 — Contratos canônicos da Inteligência Enterprise.
 * Camada de fachada · sem inventar dados · modos explícitos.
 */

export type IntelligenceMode = "deterministic" | "provider_assisted" | "unavailable";

export type IntelligenceStatus =
  | "ok"
  | "partial"
  | "empty"
  | "forbidden"
  | "unavailable"
  | "error"
  | "budget_exceeded"
  | "rate_limited"
  | "fallback_deterministic";

export type IntelligenceModule =
  | "dashboard"
  | "analytics"
  | "financeiro"
  | "crm"
  | "vendas"
  | "estoque"
  | "compras"
  | "operacoes"
  | "tributario"
  | "inteligencia"
  | "geral";

export type IntelligenceIntent =
  | "executive_summary"
  | "explain_dre"
  | "analyze_cash_flow"
  | "identify_risks"
  | "identify_opportunities"
  | "create_action_plan"
  | "compare_branches"
  | "explain_metric"
  | "summarize_crm"
  | "analyze_inventory"
  | "analyze_purchases"
  | "analyze_sales"
  | "analyze_operations"
  | "daily_brief"
  | "natural_language_query"
  | "diagnose_margin"
  | "analyze_expenses";

export type ConfidenceLevel = "alta" | "media" | "baixa" | "indisponivel";

export type IntelligenceRequest = {
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  userId: string;
  role?: string;
  permissions: readonly string[];
  module: IntelligenceModule;
  intent: IntelligenceIntent;
  question?: string;
  filters?: Record<string, unknown>;
  period?: { from?: string; to?: string; preset?: string };
  contextWindow?: string;
  locale?: string;
  timezone?: string;
  requestedMode?: IntelligenceMode;
  correlationId: string;
};

export type EvidenceItem = {
  id: string;
  source: string;
  sourceType: "metric" | "rule" | "snapshot" | "ledger" | "document" | "derived";
  module: IntelligenceModule;
  entity?: string;
  entityId?: string;
  metric?: string;
  period?: string;
  value?: string | number | null;
  unit?: string;
  calculatedAt: string;
  freshness: "fresh" | "stale" | "unknown";
  reliability: ConfidenceLevel;
  deepLink?: string;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
};

export type ConfidenceResult = {
  level: ConfidenceLevel;
  score: number | null;
  coverage: number;
  freshness: number;
  consistency: number;
  sampleSize: number;
  sourceCount: number;
  missingSources: string[];
  explanation: string;
};

export type Recommendation = {
  id: string;
  title: string;
  summary: string;
  rationale: string;
  priority: "critica" | "alta" | "media" | "baixa";
  impact: "alto" | "medio" | "baixo" | "desconhecido";
  effort: "baixo" | "medio" | "alto" | "desconhecido";
  urgency: "imediata" | "curto_prazo" | "medio_prazo" | "baixa";
  confidence: ConfidenceResult;
  sourceEvidenceIds: string[];
  module: IntelligenceModule;
  deepLink?: string;
  actionType?: string;
  actionPayload?: Record<string, unknown>;
  requiresApproval: boolean;
  expiresAt?: string;
};

export type ActionPlanStep = {
  id: string;
  title: string;
  description: string;
  order: number;
  status: "pending" | "in_progress" | "done" | "blocked";
};

export type ActionPlan = {
  id: string;
  objective: string;
  steps: ActionPlanStep[];
  owner?: string;
  responsibleRole?: string;
  deadline?: string;
  priority: Recommendation["priority"];
  status: "draft" | "pending_approval" | "approved" | "rejected" | "executed";
  evidence: string[];
  expectedImpact?: string;
  confidence: ConfidenceResult;
  createdBy: string;
  approvedBy?: string;
  executedAt?: string | null;
};

export type SimulationScenario = {
  id: string;
  title: string;
  baseline: Record<string, unknown>;
  variables: Record<string, unknown>;
  constraints: string[];
  outputs: Record<string, unknown>;
  assumptions: string[];
  confidence: ConfidenceResult;
  reversible: boolean;
  persisted: boolean;
  formulaVersion: string;
};

export type IntelligenceProviderInfo = {
  id: string;
  label: string;
  kind: IntelligenceMode;
  model?: string | null;
  isExternal: boolean;
};

export type IntelligenceResponse = {
  id: string;
  tenantId: string;
  mode: IntelligenceMode;
  status: IntelligenceStatus;
  answer: string;
  summary: string;
  evidence: EvidenceItem[];
  confidence: ConfidenceResult;
  limitations: string[];
  recommendations: Recommendation[];
  actions: ActionPlan[];
  createdAt: string;
  expiresAt?: string;
  provider: IntelligenceProviderInfo;
  model?: string | null;
  tokenUsage?: { prompt?: number; completion?: number; total?: number } | null;
  latencyMs: number;
  auditId: string;
  correlationId: string;
};

export type InsightSeverity =
  | "critica"
  | "alta"
  | "media"
  | "baixa"
  | "oportunidade"
  | "info";

export type InsightType =
  | "risco"
  | "oportunidade"
  | "desvio"
  | "tendencia"
  | "anomalia"
  | "meta"
  | "eficiencia"
  | "margem"
  | "caixa"
  | "estoque"
  | "cliente"
  | "operacao"
  | "compras"
  | "tributos"
  | "compliance"
  | "acao";

export type Insight = {
  id: string;
  type: InsightType;
  title: string;
  summary: string;
  severity: InsightSeverity;
  priority: number;
  impact: Recommendation["impact"];
  confidence: ConfidenceResult;
  evidenceIds: string[];
  origem: string;
  prazo?: string;
  deepLink?: string;
  suggestedOwnerRole?: string;
  status: "active" | "acknowledged" | "expired" | "dismissed";
  expiresAt?: string;
  module: IntelligenceModule;
};

export type ContextSnapshot = {
  snapshotId: string;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  period?: IntelligenceRequest["period"];
  generatedAt: string;
  sources: string[];
  metrics: Record<string, unknown>;
  dimensions: Record<string, unknown>;
  warnings: string[];
  missingData: string[];
  coverage: number;
  freshness: number;
  schemaVersion: string;
  checksum: string;
};

export type PromptTemplate = {
  id: string;
  name: string;
  version: string;
  intent: IntelligenceIntent;
  systemInstruction: string;
  userTemplate: string;
  requiredContext: string[];
  outputSchema: string;
  allowedRoles: string[];
  providerCapabilities: string[];
  maxTokens: number;
  temperature: number;
  active: boolean;
  changelog: string;
};

export type AutomationDraft = {
  id: string;
  title: string;
  description: string;
  trigger: string;
  module: IntelligenceModule;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "disabled";
  evidenceIds: string[];
  confidence: ConfidenceResult;
  createdAt: string;
  requiresApproval: true;
  autoExecute: false;
};

export type IntelligenceFeedback = {
  id: string;
  responseId: string;
  tenantId: string;
  userId: string;
  rating: "util" | "nao_util" | "incorreto" | "incompleto" | "desatualizado" | "irrelevante";
  comment?: string;
  createdAt: string;
  promptVersion?: string;
  providerId?: string;
  confidenceLevel?: ConfidenceLevel;
  correlationId: string;
};

export const SCHEMA_VERSION = "27.0.0";
