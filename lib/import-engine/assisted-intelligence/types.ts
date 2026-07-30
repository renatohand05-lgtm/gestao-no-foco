/**
 * Sprint 22.7 — Tipos da camada de classificação assistida / inteligência documental.
 * Independente de `lib/financial-intelligence` (cockpit DRE read-only).
 */

export type DocumentKind =
  | "dre"
  | "bank_statement"
  | "accounts_payable"
  | "accounts_receivable"
  | "payroll"
  | "trial_balance"
  | "cash_flow"
  | "sales"
  | "service_orders"
  | "unknown";

export type ConfidenceBand = "high" | "medium" | "low" | "unrecognized";

export type SuggestionOrigin =
  | "tenant_confirmed_rule"
  | "import_profile"
  | "deterministic_rule"
  | "historical_match"
  | "intelligent_provider"
  | "human_review";

export type DuplicateVerdict =
  | "exact_duplicate"
  | "probable_duplicate"
  | "possible_repeat"
  | "not_duplicate";

export type LearningMaturity =
  | "provisional"
  | "observing"
  | "reliable"
  | "manually_approved";

export type ReviewAction =
  | "confirm"
  | "edit"
  | "ignore"
  | "mark_duplicate"
  | "link_entry"
  | "create_rule"
  | "apply_similar"
  | "batch_review";

export type ExplainedSuggestion<T = string> = {
  value: T | null;
  confidence: number;
  band: ConfidenceBand;
  origin: SuggestionOrigin;
  reason: string;
  signals: string[];
  alternatives: Array<{ value: T; confidence: number; reason: string }>;
  attribution: string;
};

export type DocumentDetectionResult = {
  suggestedKind: DocumentKind;
  confidence: number;
  band: ConfidenceBand;
  signals: string[];
  alternatives: Array<{ kind: DocumentKind; confidence: number; reason: string }>;
  requiresConfirmation: boolean;
  attribution: string;
};

export type DreLineInterpretation = {
  originalLabel: string;
  recognizedAs:
    | "receita_bruta"
    | "deducoes"
    | "receita_liquida"
    | "cmv_cpv"
    | "lucro_bruto"
    | "despesas_operacionais"
    | "despesas_administrativas"
    | "despesas_comerciais"
    | "despesas_financeiras"
    | "outras_receitas"
    | "outras_despesas"
    | "ebitda"
    | "da"
    | "ebit"
    | "resultado_antes_impostos"
    | "impostos"
    | "lucro_liquido"
    | "unknown";
  amount: number | null;
  confidence: number;
  signals: string[];
};

export type DreInterpretationResult = {
  lines: DreLineInterpretation[];
  subtotalDivergences: Array<{
    label: string;
    reported: number | null;
    calculated: number | null;
    delta: number | null;
  }>;
  requiresHumanConfirmation: boolean;
  attribution: string;
};

export type PayrollField =
  | "collaborator"
  | "role"
  | "salary"
  | "pro_labore"
  | "benefits"
  | "charges"
  | "fgts"
  | "inss"
  | "vacation"
  | "thirteenth"
  | "deductions"
  | "gross_total"
  | "net_total"
  | "cost_center"
  | "competence";

export type PayrollLineInterpretation = {
  originalCells: Record<string, string>;
  mapped: Partial<Record<PayrollField, ExplainedSuggestion>>;
  maskedPii: Record<string, string>;
};

export type PayrollInterpretationResult = {
  lines: PayrollLineInterpretation[];
  requiresHumanConfirmation: boolean;
  attribution: string;
};

export type ClassificationDecision = {
  rowNumber: number;
  category: ExplainedSuggestion;
  subcategory: ExplainedSuggestion;
  costCenter: ExplainedSuggestion;
  dreGroup: ExplainedSuggestion;
  counterparty: ExplainedSuggestion;
  isTransfer: ExplainedSuggestion<boolean>;
  isRecurring: ExplainedSuggestion<boolean>;
  duplicate: {
    verdict: DuplicateVerdict;
    confidence: number;
    signals: string[];
    reason: string;
  };
  overallConfidence: number;
  overallBand: ConfidenceBand;
  winningOrigin: SuggestionOrigin;
  requiresHumanReview: boolean;
};

export type ReviewQueueItem = {
  id: string;
  tenantId: string;
  importRunId: string | null;
  rowNumber: number;
  description: string;
  decision: ClassificationDecision;
  status: "pending" | "confirmed" | "edited" | "ignored" | "duplicate" | "linked";
};

export type IntelligenceProviderId =
  | "deterministic-v1"
  | "mock-v1"
  | "external-stub";

export type IntelligenceProviderCapability =
  | "detect_document"
  | "interpret_structured"
  | "interpret_extracted"
  | "suggest_mapping"
  | "suggest_category"
  | "suggest_cost_center"
  | "suggest_dre_group"
  | "suggest_counterparty"
  | "identify_transfer"
  | "identify_recurrence"
  | "identify_duplicate"
  | "confidence"
  | "explain";

export type ClassifyRowInput = {
  tenantId: string;
  rowNumber: number;
  description: string;
  amount?: number | null;
  date?: string | null;
  headers?: string[];
  cells?: Record<string, string>;
};

export type ClassifyContext = {
  tenantConfirmedRules?: Array<{
    patterns: string[];
    category: string;
    subcategory?: string | null;
    costCenter?: string | null;
    dreGroup?: string | null;
    counterparty?: string | null;
    confidence: number;
    maturity?: LearningMaturity;
    isActive: boolean;
  }>;
  profileHints?: {
    defaultCategory?: string | null;
    defaultCostCenter?: string | null;
    defaultDreGroup?: string | null;
  };
  historicalMatches?: Array<{
    description: string;
    category: string;
    confidence: number;
  }>;
  existingFingerprints?: string[];
};
