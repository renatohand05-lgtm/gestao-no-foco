/**
 * Onboarding — tipos (Sprint 13.12).
 * Sem I/O. Sem regras financeiras.
 */

export type OnboardingStepId =
  | "welcome"
  | "company"
  | "segment"
  | "bank_account"
  | "monthly_goal"
  | "first_client"
  | "first_product"
  | "first_sale"
  | "review"
  | "dashboard";

export type OnboardingChecklistId =
  | "empresa"
  | "segmento"
  | "conta_bancaria"
  | "meta_mensal"
  | "cliente"
  | "produto"
  | "venda"
  | "dashboard";

export type OnboardingStepDefinition = {
  id: OnboardingStepId;
  title: string;
  description: string;
  required: boolean;
  estimatedMinutes: number;
  /** Quando true, conclui-se só com dados reais (checklist). */
  dataBacked?: boolean;
  checklistId?: OnboardingChecklistId;
  hrefSuffix?: string;
};

export type OnboardingChecklistItem = {
  id: OnboardingChecklistId;
  title: string;
  description: string;
  benefit: string;
  required: boolean;
  completed: boolean;
  href: string;
  ctaLabel: string;
};

export type OnboardingChecklistResult = {
  items: OnboardingChecklistItem[];
  completedCount: number;
  totalCount: number;
  requiredCompleted: number;
  requiredTotal: number;
  progressPct: number;
  nextItem: OnboardingChecklistItem | null;
  firstValueUnlocked: boolean;
  dashboardReady: boolean;
};

export type OnboardingProgressRecord = {
  id: string;
  tenantId: string;
  userId: string;
  currentStep: OnboardingStepId;
  skippedSteps: OnboardingStepId[];
  preferredPresetKey: string | null;
  tourDismissedAt: string | null;
  checklistDismissedAt: string | null;
  completedAt: string | null;
  version: number;
};

export type OnboardingSessionView = {
  progress: OnboardingProgressRecord | null;
  checklist: OnboardingChecklistResult;
  nextStep: OnboardingStepId;
  message: string;
};

export const ONBOARDING_SCHEMA_VERSION = 1;
