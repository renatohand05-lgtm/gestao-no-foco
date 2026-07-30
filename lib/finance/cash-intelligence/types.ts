/**
 * Sprint 22.6.2 — Cash Intelligence · tipos.
 * Camadas REALIZADO / PREVISTO / PROJETADO nunca se misturam.
 */

export type CashFlowLayer = "realized" | "forecast" | "projected";

export type CashDirection = "in" | "out";

export type CashFlowOriginKind =
  | "movement"
  | "payable"
  | "receivable"
  | "recurring"
  | "scenario"
  | "transfer";

export type CashFlowOrigin = {
  kind: CashFlowOriginKind;
  id: string;
  label?: string;
  correlationId?: string | null;
  importRunId?: string | null;
};

/** Título aberto (AP/AR) injetado no PREVISTO — sem duplicar engines. */
export type OpenTitleSnapshot = {
  id: string;
  tenantId: string;
  kind: "payable" | "receivable";
  description: string;
  dueDate: string;
  amountPending: number;
  status: string;
  bankAccountId: string | null;
  categoryId: string | null;
  costCenterId: string | null;
  dreGroup: string | null;
  counterparty: string | null;
  installmentLabel: string | null;
  linkedMovementId: string | null;
  overdue: boolean;
};

export type RecurringSnapshot = {
  id: string;
  tenantId: string;
  description: string;
  amount: number;
  direction: CashDirection;
  dayOfMonth: number;
  bankAccountId: string | null;
  categoryId: string | null;
  costCenterId: string | null;
  active: boolean;
};

export type CashFlowLine = {
  id: string;
  tenantId: string;
  layer: CashFlowLayer;
  date: string;
  amount: number;
  direction: CashDirection;
  description: string;
  bankAccountId: string | null;
  categoryId: string | null;
  costCenterId: string | null;
  dreGroup: string | null;
  status: string;
  origin: CashFlowOrigin;
  overdue?: boolean;
};

export type CashIntelligenceHorizonDays = 30 | 60 | 90 | 365 | number;

export type CashProjectionView =
  | "consolidated"
  | "account"
  | "cost_center"
  | "category"
  | "dre_group";

export type ConsolidatedBalance = {
  tenantId: string;
  asOf: string;
  consolidated: number;
  available: number;
  committed: number;
  activeAccounts: number;
  accounts: Array<{
    id: string;
    name: string;
    balance: number;
    status: string;
  }>;
  methodology: string;
};

export type CashLayersResult = {
  tenantId: string;
  from: string;
  to: string;
  openingBalance: number;
  realized: CashFlowLine[];
  forecast: CashFlowLine[];
  projected: CashFlowLine[];
  totals: {
    realizedIn: number;
    realizedOut: number;
    forecastIn: number;
    forecastOut: number;
    projectedIn: number;
    projectedOut: number;
  };
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
};

export type CashProjectionPoint = {
  date: string;
  opening: number;
  inflows: number;
  outflows: number;
  closing: number;
  layerBreakdown: {
    realizedIn: number;
    realizedOut: number;
    forecastIn: number;
    forecastOut: number;
    projectedIn: number;
    projectedOut: number;
  };
};

export type CashProjectionResult = {
  tenantId: string;
  horizonDays: number;
  from: string;
  to: string;
  view: CashProjectionView;
  openingBalance: number;
  projectedInflows: number;
  projectedOutflows: number;
  closingBalance: number;
  minBalance: number;
  maxBalance: number;
  minBalanceDate: string | null;
  maxBalanceDate: string | null;
  negativeDays: number;
  ruptureDate: string | null;
  capitalNeed: number;
  points: CashProjectionPoint[];
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
  insufficientData: boolean;
};

export type CashRiskSeverity = "info" | "warning" | "critical";

export type CashRiskAlert = {
  id: string;
  severity: CashRiskSeverity;
  title: string;
  description: string;
  expectedDate: string | null;
  amountNeeded: number | null;
  causes: string[];
  relatedOrigins: CashFlowOrigin[];
  recommendedAction: string;
  href: string | null;
  dedupeKey: string;
};

export type WorkingCapitalResult = {
  tenantId: string;
  horizonDays: number;
  minimum: number;
  recommended: number;
  safetyReserve: number;
  deficit: number;
  surplus: number;
  minProjectedBalance: number;
  avgPaymentDays: number | null;
  avgReceivableDays: number | null;
  confidence: "high" | "medium" | "low";
  methodology: string;
  placeholderFields: string[];
};

export type ScenarioKind = "investment" | "loan";

export type InvestmentScenarioInput = {
  id?: string;
  kind: "investment";
  name: string;
  amount: number;
  disbursementDate: string;
  installments?: number;
  extraInflows?: number;
  extraOutflows?: number;
  effectsStartDate?: string;
  horizonDays: number;
};

export type LoanScenarioInput = {
  id?: string;
  kind: "loan";
  name: string;
  principal: number;
  releaseDate: string;
  rateMonthlyPct: number;
  installments: number;
  graceMonths?: number;
  extraCosts?: number;
  firstInstallmentDate?: string;
  horizonDays: number;
};

export type ScenarioInput = InvestmentScenarioInput | LoanScenarioInput;

export type ScenarioComparison = {
  scenarioId: string;
  name: string;
  kind: ScenarioKind;
  balanceBefore: number;
  balanceAfter: number;
  minBalance: number;
  ruptureDate: string | null;
  capitalNeed: number;
  monthlyImpact: number;
  totalDisbursed: number;
  lines: CashFlowLine[];
  separatedFromReal: true;
  disclaimer: string;
};

export type RescheduleRecommendation = {
  id: string;
  title: string;
  justification: string;
  impactBefore: number;
  impactAfter: number;
  relatedOrigins: CashFlowOrigin[];
  suggestedAction:
    | "move_after_receipt"
    | "split_payment"
    | "use_other_account"
    | "anticipate_receivable"
    | "defer_investment"
    | "seek_working_capital";
  requiresHumanConfirmation: true;
  autoApplied: false;
  label: "Sugestão automática baseada em projeção de caixa.";
};

export type DrillDownNode = {
  level:
    | "indicator"
    | "period"
    | "account"
    | "category"
    | "cost_center"
    | "entry"
    | "document";
  id: string;
  label: string;
  amount?: number;
  children?: DrillDownNode[];
  entryDetail?: {
    description: string;
    amount: number;
    date: string;
    dueDate?: string | null;
    settlementDate?: string | null;
    accountName?: string | null;
    counterparty?: string | null;
    category?: string | null;
    costCenter?: string | null;
    dreGroup?: string | null;
    origin: CashFlowOrigin;
    correlationId?: string | null;
    importRunId?: string | null;
  };
};

export type ExecutiveCashDashboard = {
  tenantId: string;
  asOf: string;
  balance: ConsolidatedBalance;
  periodInflows: number;
  periodOutflows: number;
  periodNet: number;
  receivablesOpen: number;
  payablesOpen: number;
  workingCapital: WorkingCapitalResult;
  projection: CashProjectionResult;
  alerts: CashRiskAlert[];
  layers: CashLayersResult;
};
