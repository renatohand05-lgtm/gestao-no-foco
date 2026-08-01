/**
 * Fase 26.8+ — Contratos canônicos Tributário Enterprise.
 * Nenhuma alíquota legal embutida. Regras vêm de configuração versionada.
 */

export type TaxEnvironment = "configuracao" | "simulacao" | "producao";

export type TaxRuleStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "published"
  | "superseded"
  | "suspended"
  | "archived";

export type TaxJurisdictionLevel =
  | "federal"
  | "estadual"
  | "municipal"
  | "contribuicao"
  | "retencao"
  | "credito"
  | "debito"
  | "obrigacao_acessoria";

export type TaxConfidenceLevel = "alta" | "media" | "baixa" | "indisponivel";

export type TaxRegime = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  jurisdiction: string;
  active: boolean;
  validFrom: string;
  validTo: string | null;
  metadata: Record<string, unknown>;
};

export type TaxType = {
  id: string;
  code: string;
  name: string;
  level: TaxJurisdictionLevel;
  calculationType: string;
  recoverable: boolean;
  cumulative: boolean;
  active: boolean;
  metadata: Record<string, unknown>;
};

export type TaxRuleScope = {
  companyId: string | null;
  branchId: string | null;
  country: string | null;
  state: string | null;
  municipality: string | null;
  cnae: string | null;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  serviceCode: string | null;
  customerType: string | null;
  supplierType: string | null;
  operationType: string | null;
  origin: string | null;
  destination: string | null;
};

export type TaxRule = TaxRuleScope & {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  regimeId: string;
  taxTypeId: string;
  jurisdiction: string;
  conditions: Record<string, unknown>;
  calculationBase: Record<string, unknown> | null;
  rateDefinition: Record<string, unknown> | null;
  reductionDefinition: Record<string, unknown> | null;
  creditDefinition: Record<string, unknown> | null;
  retentionDefinition: Record<string, unknown> | null;
  exceptions: Record<string, unknown> | null;
  priority: number;
  validFrom: string;
  validTo: string | null;
  status: TaxRuleStatus;
  environment: TaxEnvironment;
  sourceReference: string;
  legalReference: string | null;
  version: number;
  parentVersionId: string | null;
  createdBy: string;
  reviewedBy: string | null;
  approvedBy: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  deletedAt: string | null;
};

export type TaxRuleVersion = {
  id: string;
  ruleId: string;
  tenantId: string;
  version: number;
  snapshot: TaxRule;
  changeReason: string;
  changeSummary: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: TaxRuleStatus;
  createdBy: string;
  reviewedBy: string | null;
  approvedBy: string | null;
  createdAt: string;
};

export type TaxObligationDefinition = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  jurisdiction: string;
  regime: string | null;
  frequency: string;
  dueDateRule: Record<string, unknown>;
  applicability: Record<string, unknown>;
  source: string;
  validFrom: string;
  validTo: string | null;
  status: TaxRuleStatus;
  version: number;
};

export type TaxCalculationTrace = {
  id: string;
  tenantId: string;
  companyId: string | null;
  branchId: string | null;
  ruleVersionId: string;
  sourceDocument: string | null;
  sourceDocumentId: string | null;
  calculationDate: string;
  period: string;
  inputs: Record<string, unknown>;
  steps: Array<Record<string, unknown>>;
  baseAmount: number | null;
  rate: number | null;
  reduction: number | null;
  credit: number | null;
  debit: number | null;
  retention: number | null;
  result: number | null;
  currency: string;
  warnings: string[];
  limitations: string[];
  correlationId: string;
  environment: TaxEnvironment;
};

export type TaxAuditEvent = {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  correlationId: string;
  createdAt: string;
};

export type TaxMatchContext = {
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  country?: string | null;
  state?: string | null;
  municipality?: string | null;
  regimeId?: string | null;
  taxTypeId?: string | null;
  cnae?: string | null;
  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  serviceCode?: string | null;
  customerType?: string | null;
  supplierType?: string | null;
  operationType?: string | null;
  origin?: string | null;
  destination?: string | null;
  asOf: string;
  environment: TaxEnvironment;
};

export type TaxPrecedenceResult = {
  candidates: TaxRule[];
  winner: TaxRule | null;
  reason: string;
  conflicts: string[];
  decisionOrder: string[];
};

export type TaxRuleDiff = {
  previousVersion: number | null;
  currentVersion: number;
  changedFields: string[];
  previous: Partial<TaxRule> | null;
  current: Partial<TaxRule>;
  changeReason: string;
  estimatedImpact: string | null;
  validFrom: string;
  validTo: string | null;
  responsible: string;
};

export type TaxValidationIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  field?: string;
};

/* ——— 26.9 Simulation ——— */

export type TaxScenarioType =
  | "baseline"
  | "pessimistic"
  | "expected"
  | "optimistic"
  | "custom";

export type TaxSimulationStatus =
  | "draft"
  | "running"
  | "completed"
  | "archived"
  | "error";

export type TaxSimulationResult = {
  grossRevenue: number | null;
  deductions: number | null;
  taxableBase: number | null;
  taxesByType: Array<{ code: string; amount: number; source: string }>;
  totalTaxes: number | null;
  effectiveTaxRate: number | null;
  credits: number | null;
  retentions: number | null;
  obligations: Array<{ code: string; status: string }>;
  cashFlowImpact: number | null;
  EBITDAImpact: number | null;
  marginImpact: number | null;
  netResultImpact: number | null;
  monthlyProjection: Array<{ period: string; amount: number | null }>;
  warnings: string[];
  confidence: TaxConfidenceLevel;
  calculationTrace: string[];
  limitations: string[];
  assumptionsVisible: string[];
};

export type TaxScenario = {
  id: string;
  simulationId: string;
  name: string;
  type: TaxScenarioType;
  description: string | null;
  variables: Record<string, unknown>;
  assumptions: string[];
  constraints: Record<string, unknown>;
  taxRuleVersionIds: string[];
  result: TaxSimulationResult | null;
  confidence: TaxConfidenceLevel;
  limitations: string[];
};

export type TaxSimulation = {
  id: string;
  tenantId: string;
  companyId: string | null;
  branchId: string | null;
  name: string;
  description: string | null;
  status: TaxSimulationStatus;
  baselinePeriod: string;
  targetPeriod: string;
  currency: string;
  regimes: string[];
  assumptions: string[];
  variables: Record<string, unknown>;
  scenarios: TaxScenario[];
  results: TaxSimulationResult | null;
  confidence: TaxConfidenceLevel;
  warnings: string[];
  ruleVersions: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Simulações nunca mutam cálculo oficial. */
  mutatesOfficial: false;
};

/* ——— 26.10 Executive ——— */

export type TaxCalendarItemStatus =
  | "futuro"
  | "proximo"
  | "hoje"
  | "vencido"
  | "concluido"
  | "indisponivel";

export type TaxCalendarItem = {
  id: string;
  obligationCode: string;
  obligationName: string;
  taxType: string | null;
  companyId: string | null;
  branchId: string | null;
  jurisdiction: string;
  period: string;
  dueDate: string | null;
  status: TaxCalendarItemStatus;
  criticality: "baixa" | "media" | "alta" | "critica";
  amount: number | null;
  responsible: string | null;
  source: string | null;
  deepLink: string | null;
};

export type TaxAlertSeverity = "info" | "warning" | "high" | "critical";

export type TaxAlert = {
  id: string;
  code: string;
  title: string;
  severity: TaxAlertSeverity;
  origin: string;
  period: string | null;
  evidence: string[];
  impact: string | null;
  confidence: TaxConfidenceLevel;
  responsible: string | null;
  deadline: string | null;
  suggestedAction: string | null;
  deepLink: string | null;
};

export type TaxProjectionMethod =
  | "historical_average"
  | "scenario_weighted"
  | "rule_based"
  | "unavailable";

export type TaxProjection = {
  horizonDays: 30 | 60 | 90 | 365;
  projectedAmount: number | null;
  method: TaxProjectionMethod;
  taxes: Array<{ code: string; amount: number | null }>;
  cashImpact: number | null;
  obligations: string[];
  peaks: string[];
  trend: "up" | "down" | "flat" | "unknown";
  confidence: TaxConfidenceLevel;
  assumptions: string[];
  limitations: string[];
};

export type TaxSupplierRankItem = {
  supplierId: string;
  supplierName: string;
  estimatedEconomicCost: number | null;
  taxBenefit: number | null;
  risk: string;
  confidence: TaxConfidenceLevel;
  assumptions: string[];
  period: string;
  coverageSufficient: boolean;
};

export type TaxActionPlanDraft = {
  id: string;
  objective: string;
  risk: string;
  priority: "baixa" | "media" | "alta";
  steps: string[];
  responsible: string | null;
  deadline: string | null;
  impact: string | null;
  evidence: string[];
  confidence: TaxConfidenceLevel;
  requiresProfessionalValidation: true;
  autoExecute: false;
};

export type TaxIntegrationStatus =
  | "nao_configurado"
  | "configurado"
  | "testando"
  | "ativo"
  | "degradado"
  | "erro"
  | "suspenso";

export type TaxIntegrationProvider = {
  id: string;
  name: string;
  status: TaxIntegrationStatus;
  capabilities: Array<
    | "healthCheck"
    | "importDocuments"
    | "importTaxRules"
    | "importObligations"
    | "exportCalculations"
    | "reconcile"
    | "validate"
    | "getStatus"
  >;
  hasRealCredentials: boolean;
};

export type TaxIntelligenceIntent =
  | "explain_tax_burden"
  | "explain_tax_change"
  | "identify_tax_risks"
  | "identify_tax_opportunities"
  | "compare_tax_scenarios"
  | "summarize_tax_obligations"
  | "forecast_tax_cash_impact"
  | "explain_supplier_tax_impact"
  | "create_tax_action_plan";

export type TaxIntelligenceAnswer = {
  intent: TaxIntelligenceIntent;
  answer: string;
  evidence: string[];
  confidence: TaxConfidenceLevel;
  limitations: string[];
  deepLinks: string[];
  mode: "deterministic";
};
