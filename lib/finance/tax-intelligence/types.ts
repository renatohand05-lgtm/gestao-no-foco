/**
 * Sprint 26.7 — Enterprise Tax Intelligence · tipos.
 * Nenhuma alíquota ou regra fiscal embutida — tudo via configuração versionada.
 */

export type TaxRegimeCode =
  | "simples_nacional"
  | "lucro_presumido"
  | "lucro_real"
  | "cbs"
  | "ibs"
  | "custom";

export type TaxRuleStatus = "draft" | "active" | "superseded" | "archived";

/** Parâmetro tipado de uma versão de regra (chave → valor numérico/texto). */
export type TaxParameterValue = number | string | boolean;

export type TaxParameterMap = Record<string, TaxParameterValue>;

/**
 * Versão de regra tributária parametrizada.
 * Providers leem somente estes parâmetros — sem fallback hardcoded.
 */
export type TaxRuleVersion = {
  id: string;
  tenantId: string;
  regimeCode: TaxRegimeCode;
  versionLabel: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: TaxRuleStatus;
  /** Chaves esperadas dependem do provider (ex.: rate_effective, base_multiplier). */
  parameters: TaxParameterMap;
  jurisdiction?: string | null;
  notes?: string | null;
};

export type TaxEntityKind = "company" | "branch" | "cost_center";

export type TaxEntity = {
  id: string;
  tenantId: string;
  kind: TaxEntityKind;
  name: string;
  document?: string | null;
  parentId?: string | null;
  regimeCode: TaxRegimeCode;
  active: boolean;
  metadata?: Record<string, TaxParameterValue>;
};

/** Base tributável / operacional injetada no motor (não inventa faturamento). */
export type TaxBaseLine = {
  id: string;
  tenantId: string;
  entityId: string;
  period: string;
  kind: "revenue" | "expense" | "credit" | "deduction" | "other";
  amount: number;
  productMixShare?: number;
  serviceMixShare?: number;
  regionCode?: string | null;
  costCenterId?: string | null;
  categoryId?: string | null;
  label?: string;
};

export type TaxComputationInput = {
  tenantId: string;
  asOf: string;
  regimeCode: TaxRegimeCode;
  entityId: string;
  period: string;
  bases: TaxBaseLine[];
  ruleVersion: TaxRuleVersion;
};

export type TaxComponentResult = {
  code: string;
  label: string;
  baseAmount: number;
  rateApplied: number | null;
  amount: number;
  parameterKeysUsed: string[];
  explanation: string;
};

export type TaxComputationResult = {
  tenantId: string;
  entityId: string;
  period: string;
  regimeCode: TaxRegimeCode;
  ruleVersionId: string;
  ruleVersionLabel: string;
  components: TaxComponentResult[];
  totalTax: number;
  effectiveRate: number | null;
  taxableBase: number;
  methodology: string;
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
};

export type TaxDrillDownDimension =
  | "period"
  | "company"
  | "branch"
  | "cost_center"
  | "regime"
  | "component"
  | "opportunity";

export type TaxDrillDownRequest = {
  dimension: TaxDrillDownDimension;
  id?: string | null;
  periodFrom?: string;
  periodTo?: string;
};

export type TaxDrillDownItem = {
  id: string;
  label: string;
  amount: number;
  share: number;
  meta?: Record<string, string | number | null>;
};

export type TaxDrillDownResult = {
  dimension: TaxDrillDownDimension;
  items: TaxDrillDownItem[];
  total: number;
  methodology: string;
};

export type TaxEfficiencyIndicator = {
  key: string;
  label: string;
  value: number;
  unit: "ratio" | "currency" | "percent" | "count";
  benchmark?: number | null;
  explanation: string;
};

export type TaxOpportunity = {
  id: string;
  title: string;
  estimatedImpact: number;
  confidence: "high" | "medium" | "low";
  origin: string;
  requiresHumanReview: true;
  explanation: string;
};

export type TaxReformImpact = {
  summary: string;
  projectedDelta: number;
  regimesInScope: TaxRegimeCode[];
  confidence: "high" | "medium" | "low";
  explanation: string;
  parameterSources: string[];
};

export type ExecutiveTaxDashboard = {
  tenantId: string;
  asOf: string;
  consolidatedLoad: number;
  projectedLoad: number;
  realizedVsProjectedDelta: number;
  byPeriod: TaxDrillDownItem[];
  byCompany: TaxDrillDownItem[];
  byBranch: TaxDrillDownItem[];
  byCostCenter: TaxDrillDownItem[];
  monthlyTrend: Array<{ period: string; realized: number; projected: number }>;
  efficiency: TaxEfficiencyIndicator[];
  reformImpact: TaxReformImpact;
  opportunities: TaxOpportunity[];
  alertsCount: number;
  emptyReason: string | null;
  methodology: string;
};

export type TaxSimulationKind =
  | "regime_change"
  | "revenue_growth"
  | "new_branch"
  | "product_mix"
  | "service_mix"
  | "regional_expansion"
  | "acquisition";

export type TaxSimulationInput = {
  kind: TaxSimulationKind;
  label: string;
  /** Fatores e alvos — interpretados apenas com regras parametrizadas. */
  factors: TaxParameterMap;
  baselineResults: TaxComputationResult[];
  alternateRuleVersion?: TaxRuleVersion | null;
  alternateRegimeCode?: TaxRegimeCode | null;
};

export type TaxSimulationComparison = {
  kind: TaxSimulationKind;
  label: string;
  baselineTotal: number;
  simulatedTotal: number;
  delta: number;
  deltaPercent: number | null;
  explanation: string;
  confidence: "high" | "medium" | "low";
  requiresHumanReview: true;
  components: Array<{
    code: string;
    baseline: number;
    simulated: number;
    delta: number;
  }>;
};

export type TaxSupplierSnapshot = {
  id: string;
  name: string;
  document?: string | null;
  regimeCode?: TaxRegimeCode | null;
  regionCode?: string | null;
  unitCost: number;
  historicalReliability: number;
  operationalScore: number;
  taxBenefitScore?: number | null;
  metadata?: TaxParameterMap;
};

export type TaxSupplierRankingWeights = {
  taxImpact: number;
  fiscalBenefit: number;
  totalCost: number;
  history: number;
  location: number;
  regime: number;
  operational: number;
};

export type TaxSupplierRankItem = {
  supplierId: string;
  name: string;
  score: number;
  rank: number;
  justification: string;
  breakdown: Record<string, number>;
  requiresHumanReview: true;
};

export type TaxCashflowScenario = "optimistic" | "neutral" | "conservative";

export type TaxCashflowPoint = {
  date: string;
  taxOutflow: number;
  cashImpact: number;
  workingCapitalImpact: number;
  dueLabel?: string | null;
};

export type TaxCashflowProjection = {
  tenantId: string;
  scenario: TaxCashflowScenario;
  from: string;
  to: string;
  points: TaxCashflowPoint[];
  totalTaxOutflow: number;
  peakOutflow: number;
  peakDate: string | null;
  seasonalityNote: string;
  methodology: string;
  confidence: "high" | "medium" | "low";
};

export type TaxAlertSeverity = "info" | "warning" | "critical";

export type TaxAlertKind =
  | "load_spike"
  | "upcoming_due"
  | "inconsistency"
  | "legal_change"
  | "savings_opportunity"
  | "fiscal_risk"
  | "ebitda_impact"
  | "cashflow_impact";

export type TaxAlert = {
  id: string;
  kind: TaxAlertKind;
  severity: TaxAlertSeverity;
  title: string;
  message: string;
  amount?: number | null;
  origin: string;
  confidence: "high" | "medium" | "low";
  requiresHumanReview: true;
  autoApplied: false;
};

export type TaxReportSection =
  | "executive"
  | "accounting"
  | "financial"
  | "comparatives"
  | "history"
  | "trends"
  | "risks"
  | "opportunities"
  | "simulations";

export type TaxReportExportFormat = "pdf" | "excel" | "print";

export type TaxEnterpriseReport = {
  tenantId: string;
  generatedAt: string;
  title: string;
  sections: Array<{
    id: TaxReportSection;
    title: string;
    summary: string;
    metrics: Array<{ label: string; value: string }>;
  }>;
  exportFormatsPrepared: TaxReportExportFormat[];
  methodology: string;
};

export type TaxAiRecommendation = {
  id: string;
  title: string;
  explanation: string;
  origin: string;
  confidence: "high" | "medium" | "low";
  requiresHumanReview: true;
  autoExecuted: false;
  suggestedScenarios?: string[];
  relatedAlertIds?: string[];
};

export type TaxIntegrationConnectorStatus =
  | "preparing"
  | "disabled"
  | "unavailable";

export type TaxIntegrationConnector = {
  id: string;
  category: "erp" | "fiscal" | "accounting" | "government" | "tax_provider";
  name: string;
  status: TaxIntegrationConnectorStatus;
  description: string;
  featureFlag?: string;
};

export type TaxIntelligenceSnapshot = {
  tenantId: string;
  tenantSlug: string;
  asOf: string;
  entities: TaxEntity[];
  ruleVersions: TaxRuleVersion[];
  bases: TaxBaseLine[];
  suppliers?: TaxSupplierSnapshot[];
  projectedAssessments?: TaxComputationResult[];
};
