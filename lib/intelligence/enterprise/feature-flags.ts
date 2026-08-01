/**
 * Fase 27 — Feature flags Inteligência Enterprise.
 * Defaults seguros: deterministic ON, external OFF.
 */

function envFlag(name: string, defaultOn = false): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return defaultOn;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type IntelligenceFeatureFlags = {
  enabled: boolean;
  deterministic: boolean;
  externalProvider: boolean;
  executiveCopilot: boolean;
  dreExplanation: boolean;
  cashAnalysis: boolean;
  riskDetection: boolean;
  actionPlans: boolean;
  branchComparison: boolean;
  dailyBrief: boolean;
  naturalLanguageQuery: boolean;
  crm: boolean;
  inventory: boolean;
  purchases: boolean;
  sales: boolean;
  operations: boolean;
  automationDrafts: boolean;
};

export function getIntelligenceFeatureFlags(
  overrides?: Partial<IntelligenceFeatureFlags>,
): IntelligenceFeatureFlags {
  const base: IntelligenceFeatureFlags = {
    enabled: envFlag("INTELLIGENCE_ENABLED", true),
    deterministic: envFlag("INTELLIGENCE_DETERMINISTIC_ENABLED", true),
    externalProvider: envFlag("INTELLIGENCE_EXTERNAL_PROVIDER_ENABLED", false),
    executiveCopilot: envFlag("INTELLIGENCE_EXECUTIVE_COPILOT_ENABLED", true),
    dreExplanation: envFlag("INTELLIGENCE_DRE_EXPLANATION_ENABLED", true),
    cashAnalysis: envFlag("INTELLIGENCE_CASH_ANALYSIS_ENABLED", true),
    riskDetection: envFlag("INTELLIGENCE_RISK_DETECTION_ENABLED", true),
    actionPlans: envFlag("INTELLIGENCE_ACTION_PLANS_ENABLED", true),
    branchComparison: envFlag("INTELLIGENCE_BRANCH_COMPARISON_ENABLED", true),
    dailyBrief: envFlag("INTELLIGENCE_DAILY_BRIEF_ENABLED", true),
    naturalLanguageQuery: envFlag("INTELLIGENCE_NLQ_ENABLED", true),
    crm: envFlag("INTELLIGENCE_CRM_ENABLED", true),
    inventory: envFlag("INTELLIGENCE_INVENTORY_ENABLED", true),
    purchases: envFlag("INTELLIGENCE_PURCHASES_ENABLED", true),
    sales: envFlag("INTELLIGENCE_SALES_ENABLED", true),
    operations: envFlag("INTELLIGENCE_OPERATIONS_ENABLED", true),
    automationDrafts: envFlag("INTELLIGENCE_AUTOMATION_DRAFTS_ENABLED", true),
  };
  return { ...base, ...overrides };
}

export function isIntelligenceCapabilityEnabled(
  flags: IntelligenceFeatureFlags,
  capability: keyof Omit<IntelligenceFeatureFlags, "enabled">,
): boolean {
  if (!flags.enabled) return false;
  return Boolean(flags[capability]);
}
