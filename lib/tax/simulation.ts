/**
 * Sprint 26.9 — Motor de simulação (isolado do oficial).
 * Não inventa alíquotas; usa apenas variáveis/premissas e ruleVersions informados.
 */

import type {
  TaxConfidenceLevel,
  TaxScenario,
  TaxScenarioType,
  TaxSimulation,
  TaxSimulationResult,
} from "./types.ts";
import { assertSimulationIsolation } from "./environments.ts";

export function emptySimulationResult(
  assumptions: string[],
  limitations: string[],
  confidence: TaxConfidenceLevel = "indisponivel",
): TaxSimulationResult {
  return {
    grossRevenue: null,
    deductions: null,
    taxableBase: null,
    taxesByType: [],
    totalTaxes: null,
    effectiveTaxRate: null,
    credits: null,
    retentions: null,
    obligations: [],
    cashFlowImpact: null,
    EBITDAImpact: null,
    marginImpact: null,
    netResultImpact: null,
    monthlyProjection: [],
    warnings: [],
    confidence,
    calculationTrace: [],
    limitations,
    assumptionsVisible: assumptions,
  };
}

export function computeSimulationConfidence(input: {
  hasRuleVersions: boolean;
  assumptionCount: number;
  hasRevenue: boolean;
  coverageNotes: string[];
}): TaxConfidenceLevel {
  if (!input.hasRuleVersions || !input.hasRevenue) return "indisponivel";
  if (input.coverageNotes.length > 2) return "baixa";
  if (input.assumptionCount < 2) return "baixa";
  if (input.coverageNotes.length > 0) return "media";
  return "alta";
}

/**
 * Aplica variáveis declaradas — sem inventar taxas.
 * Se rateEffective estiver nas premissas/variáveis, usa; senão marca indisponível.
 */
export function runScenarioCalculation(input: {
  scenario: Pick<TaxScenario, "variables" | "assumptions" | "taxRuleVersionIds" | "type">;
  baselineRevenue: number | null;
}): TaxSimulationResult {
  assertSimulationIsolation(false);
  const limitations: string[] = [];
  const assumptions = [...input.scenario.assumptions];
  const vars = input.scenario.variables ?? {};

  const growth =
    typeof vars.revenueGrowthPct === "number" ? vars.revenueGrowthPct : null;
  let revenue = input.baselineRevenue;
  if (revenue != null && growth != null) {
    revenue = revenue * (1 + growth / 100);
    assumptions.push(`Crescimento informado: ${growth}%`);
  } else if (revenue == null) {
    limitations.push("Receita base ausente — não inventada");
  }

  const rate =
    typeof vars.rateEffective === "number" ? vars.rateEffective : null;
  if (rate == null) {
    limitations.push(
      "Alíquota efetiva não informada nas variáveis — resultado parcial",
    );
  }

  const taxes =
    revenue != null && rate != null
      ? [{ code: "estimado", amount: revenue * rate, source: "variavel:rateEffective" }]
      : [];

  const totalTaxes = taxes.length ? taxes.reduce((s, t) => s + t.amount, 0) : null;
  const confidence = computeSimulationConfidence({
    hasRuleVersions: input.scenario.taxRuleVersionIds.length > 0,
    assumptionCount: assumptions.length,
    hasRevenue: revenue != null,
    coverageNotes: limitations,
  });

  const cash =
    typeof vars.cashFlowDelta === "number"
      ? vars.cashFlowDelta
      : totalTaxes != null
        ? -totalTaxes
        : null;
  const ebitda =
    typeof vars.ebitdaDelta === "number" ? vars.ebitdaDelta : null;
  const margin =
    typeof vars.marginDelta === "number" ? vars.marginDelta : null;

  return {
    grossRevenue: revenue,
    deductions: typeof vars.deductions === "number" ? vars.deductions : null,
    taxableBase: revenue,
    taxesByType: taxes,
    totalTaxes,
    effectiveTaxRate: rate,
    credits: typeof vars.credits === "number" ? vars.credits : null,
    retentions: typeof vars.retentions === "number" ? vars.retentions : null,
    obligations: [],
    cashFlowImpact: cash,
    EBITDAImpact: ebitda,
    marginImpact: margin,
    netResultImpact:
      totalTaxes != null && revenue != null ? revenue - totalTaxes : null,
    monthlyProjection: [],
    warnings:
      input.scenario.type === "optimistic"
        ? ["Cenário otimista — validar premissas com contador"]
        : [],
    confidence,
    calculationTrace: [
      "isolation:ok",
      `scenario:${input.scenario.type}`,
      `rules:${input.scenario.taxRuleVersionIds.join(",") || "none"}`,
    ],
    limitations,
    assumptionsVisible: assumptions,
  };
}

export function compareRegimesLanguage(winnerLabel: string): string {
  return `Cenário com menor impacto estimado segundo as premissas informadas: ${winnerLabel}. Não constitui parecer contábil ou jurídico.`;
}

export function createSimulationShell(input: {
  tenantId: string;
  createdBy: string;
  name: string;
  baselinePeriod: string;
  targetPeriod: string;
  assumptions: string[];
  ruleVersions: string[];
  companyId?: string | null;
  branchId?: string | null;
}): TaxSimulation {
  const now = new Date().toISOString();
  return {
    id: `sim-${Date.now()}`,
    tenantId: input.tenantId,
    companyId: input.companyId ?? null,
    branchId: input.branchId ?? null,
    name: input.name,
    description: null,
    status: "draft",
    baselinePeriod: input.baselinePeriod,
    targetPeriod: input.targetPeriod,
    currency: "BRL",
    regimes: [],
    assumptions: input.assumptions,
    variables: {},
    scenarios: [],
    results: null,
    confidence: "indisponivel",
    warnings: [],
    ruleVersions: input.ruleVersions,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    mutatesOfficial: false,
  };
}

export function buildScenario(
  simulationId: string,
  type: TaxScenarioType,
  name: string,
  variables: Record<string, unknown>,
  assumptions: string[],
  taxRuleVersionIds: string[],
): TaxScenario {
  return {
    id: `scn-${type}-${Date.now()}`,
    simulationId,
    name,
    type,
    description: null,
    variables,
    assumptions,
    constraints: {},
    taxRuleVersionIds,
    result: null,
    confidence: "indisponivel",
    limitations: [],
  };
}

export function branchIncrementalImpact(input: {
  currentBranchTax: number | null;
  newBranchTax: number | null;
}): {
  consolidated: number | null;
  current: number | null;
  incremental: number | null;
  labeled: true;
} {
  const current = input.currentBranchTax;
  const neu = input.newBranchTax;
  const consolidated =
    current != null && neu != null ? current + neu : current ?? neu;
  const incremental =
    current != null && neu != null ? neu : neu != null ? neu : null;
  return {
    consolidated,
    current,
    incremental,
    labeled: true,
  };
}

export const SUPPORTED_SCENARIO_KINDS = [
  "revenue_growth",
  "revenue_decline",
  "new_branch",
  "close_branch",
  "regime_change",
  "state_change",
  "municipality_change",
  "cnae_change",
  "product_mix",
  "service_mix",
  "hiring",
  "supplier_change",
  "origin_destination",
  "price_change",
  "margin_change",
  "investment",
  "loan",
  "expansion",
  "seasonality",
  "rule_transition",
  "future_validity",
] as const;

export function scenarioKindAvailable(
  kind: string,
  hasModel: boolean,
): { available: boolean; reason: string } {
  if (!SUPPORTED_SCENARIO_KINDS.includes(kind as (typeof SUPPORTED_SCENARIO_KINDS)[number])) {
    return { available: false, reason: "Tipo de cenário não suportado" };
  }
  if (!hasModel) {
    return {
      available: false,
      reason: "Indisponível — sem modelo/fonte configurada para o campo",
    };
  }
  return { available: true, reason: "ok" };
}
