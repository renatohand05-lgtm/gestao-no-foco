/**
 * Sprint 26.10 — Serviços executivos tributários (deterministic).
 * Sem inventar obrigações, alíquotas ou rankings sem cobertura.
 */

import type {
  TaxActionPlanDraft,
  TaxAlert,
  TaxCalendarItem,
  TaxConfidenceLevel,
  TaxIntegrationProvider,
  TaxIntelligenceAnswer,
  TaxIntelligenceIntent,
  TaxObligationDefinition,
  TaxProjection,
  TaxRule,
  TaxSupplierRankItem,
} from "./types.ts";

export function buildTaxCalendar(input: {
  obligations: TaxObligationDefinition[];
  asOf: string;
  tenantSlug: string;
}): TaxCalendarItem[] {
  return input.obligations.map((o) => {
    if (!o.source) {
      return {
        id: o.id,
        obligationCode: o.code,
        obligationName: o.name,
        taxType: null,
        companyId: null,
        branchId: null,
        jurisdiction: o.jurisdiction,
        period: input.asOf.slice(0, 7),
        dueDate: null,
        status: "indisponivel" as const,
        criticality: "media" as const,
        amount: null,
        responsible: null,
        source: null,
        deepLink: `/${input.tenantSlug}/tributario/obrigacoes`,
      };
    }
    const due =
      typeof o.dueDateRule?.nextDue === "string" ? o.dueDateRule.nextDue : null;
    let status: TaxCalendarItem["status"] = "futuro";
    if (!due) status = "indisponivel";
    else if (due < input.asOf.slice(0, 10)) status = "vencido";
    else if (due === input.asOf.slice(0, 10)) status = "hoje";
    else {
      const diff =
        (Date.parse(due) - Date.parse(input.asOf.slice(0, 10))) / 86400000;
      status = diff <= 7 ? "proximo" : "futuro";
    }
    return {
      id: o.id,
      obligationCode: o.code,
      obligationName: o.name,
      taxType: o.regime,
      companyId: null,
      branchId: null,
      jurisdiction: o.jurisdiction,
      period: input.asOf.slice(0, 7),
      dueDate: due,
      status,
      criticality: status === "vencido" ? "critica" : "media",
      amount: null,
      responsible: null,
      source: o.source,
      deepLink: `/${input.tenantSlug}/tributario/obrigacoes`,
    };
  });
}

export function detectTaxAlerts(input: {
  rules: TaxRule[];
  asOf: string;
  tenantSlug: string;
}): TaxAlert[] {
  const alerts: TaxAlert[] = [];
  for (const r of input.rules) {
    if (!r.sourceReference) {
      alerts.push({
        id: `alert-source-${r.id}`,
        code: "rule_without_source",
        title: `Regra ${r.code} sem fonte`,
        severity: "high",
        origin: "tax.rules",
        period: null,
        evidence: [`rule:${r.id}`],
        impact: "Publicação bloqueada até fonte",
        confidence: "alta",
        responsible: r.createdBy,
        deadline: null,
        suggestedAction: "Completar sourceReference",
        deepLink: `/${input.tenantSlug}/tributario/regras/${r.id}`,
      });
    }
    if (r.validTo) {
      const days =
        (Date.parse(r.validTo) - Date.parse(input.asOf.slice(0, 10))) / 86400000;
      if (days >= 0 && days <= 30 && r.status === "published") {
        alerts.push({
          id: `alert-expiry-${r.id}`,
          code: "rule_near_expiry",
          title: `Vigência de ${r.code} termina em ${Math.floor(days)}d`,
          severity: "warning",
          origin: "tax.validity",
          period: r.validTo,
          evidence: [`validTo:${r.validTo}`, `version:${r.version}`],
          impact: "Risco de lacuna de cobertura",
          confidence: "alta",
          responsible: r.approvedBy,
          deadline: r.validTo,
          suggestedAction: "Criar nova versão com vigência futura",
          deepLink: `/${input.tenantSlug}/tributario/versoes`,
        });
      }
    }
  }
  return alerts;
}

export function projectTax(input: {
  horizonDays: 30 | 60 | 90 | 365;
  historicalMonthly: number[] | null;
  assumptions: string[];
}): TaxProjection {
  if (!input.historicalMonthly || input.historicalMonthly.length === 0) {
    return {
      horizonDays: input.horizonDays,
      projectedAmount: null,
      method: "unavailable",
      taxes: [],
      cashImpact: null,
      obligations: [],
      peaks: [],
      trend: "unknown",
      confidence: "indisponivel",
      assumptions: input.assumptions,
      limitations: [
        "Sem série histórica — projeção linear silenciosa não aplicada",
      ],
    };
  }
  const avg =
    input.historicalMonthly.reduce((a, b) => a + b, 0) /
    input.historicalMonthly.length;
  const months = Math.max(1, Math.round(input.horizonDays / 30));
  const last = input.historicalMonthly[input.historicalMonthly.length - 1];
  const first = input.historicalMonthly[0];
  const trend =
    last > first * 1.05 ? "up" : last < first * 0.95 ? "down" : "flat";
  return {
    horizonDays: input.horizonDays,
    projectedAmount: avg * months,
    method: "historical_average",
    taxes: [{ code: "agregado", amount: avg * months }],
    cashImpact: -(avg * months),
    obligations: [],
    peaks: [],
    trend,
    confidence: input.historicalMonthly.length >= 3 ? "media" : "baixa",
    assumptions: [
      ...input.assumptions,
      "Método: média histórica mensal × horizonte",
    ],
    limitations: ["Não é projeção linear silenciosa; método explícito"],
  };
}

export function rankSuppliersTax(input: {
  items: Array<{
    supplierId: string;
    supplierName: string;
    totalCost: number | null;
    taxAmount: number | null;
    credits: number | null;
    coverageOk: boolean;
  }>;
  period: string;
}): TaxSupplierRankItem[] {
  return input.items.map((i) => {
    if (!i.coverageOk || i.totalCost == null) {
      return {
        supplierId: i.supplierId,
        supplierName: i.supplierName,
        estimatedEconomicCost: null,
        taxBenefit: null,
        risk: "cobertura insuficiente",
        confidence: "indisponivel" as TaxConfidenceLevel,
        assumptions: [],
        period: input.period,
        coverageSufficient: false,
      };
    }
    return {
      supplierId: i.supplierId,
      supplierName: i.supplierName,
      estimatedEconomicCost: i.totalCost,
      taxBenefit: i.credits,
      risk: "avaliar operacionalmente",
      confidence: "media",
      assumptions: ["Ranking complementar — não substitui avaliação comercial"],
      period: input.period,
      coverageSufficient: true,
    };
  });
}

export function draftTaxActionPlan(input: {
  objective: string;
  risk: string;
  evidence: string[];
  steps: string[];
}): TaxActionPlanDraft {
  return {
    id: `plan-${Date.now()}`,
    objective: input.objective,
    risk: input.risk,
    priority: "media",
    steps: input.steps,
    responsible: null,
    deadline: null,
    impact: null,
    evidence: input.evidence,
    confidence: input.evidence.length ? "media" : "baixa",
    requiresProfessionalValidation: true,
    autoExecute: false,
  };
}

export function listIntegrationProviders(): TaxIntegrationProvider[] {
  return [
    {
      id: "accounting",
      name: "Contabilidade",
      status: "nao_configurado",
      capabilities: ["healthCheck", "importTaxRules", "importObligations"],
      hasRealCredentials: false,
    },
    {
      id: "fiscal_issuer",
      name: "Emissão fiscal",
      status: "nao_configurado",
      capabilities: ["healthCheck", "importDocuments", "exportCalculations"],
      hasRealCredentials: false,
    },
    {
      id: "gov",
      name: "Documentos / governos",
      status: "nao_configurado",
      capabilities: ["healthCheck", "validate", "getStatus"],
      hasRealCredentials: false,
    },
  ];
}

export function answerTaxIntelligence(input: {
  intent: TaxIntelligenceIntent;
  evidence: string[];
  periodComparable: boolean;
  calcValid: boolean;
  ruleId?: string;
  version?: number;
  burdenDeltaPct?: number | null;
  tenantSlug: string;
}): TaxIntelligenceAnswer {
  const limitations: string[] = [];
  if (!input.evidence.length) {
    return {
      intent: input.intent,
      answer:
        "Não há evidências suficientes para responder. Nenhuma afirmação foi inventada.",
      evidence: [],
      confidence: "indisponivel",
      limitations: ["Evidência obrigatória ausente"],
      deepLinks: [`/${input.tenantSlug}/tributario/executivo`],
      mode: "deterministic",
    };
  }
  if (
    input.intent === "explain_tax_change" ||
    input.intent === "explain_tax_burden"
  ) {
    if (!input.periodComparable || !input.calcValid || input.burdenDeltaPct == null) {
      limitations.push("Período/cálculo incompleto — sem afirmação de aumento");
      return {
        intent: input.intent,
        answer:
          "Não é possível afirmar variação de carga sem período comparável, cálculo válido e evidência.",
        evidence: input.evidence,
        confidence: "baixa",
        limitations,
        deepLinks: [`/${input.tenantSlug}/tributario/executivo`],
        mode: "deterministic",
      };
    }
    const dir =
      input.burdenDeltaPct > 0
        ? "aumentou"
        : input.burdenDeltaPct < 0
          ? "diminuiu"
          : "permaneceu estável";
    return {
      intent: input.intent,
      answer: `Carga tributária ${dir} no período analisado (${input.burdenDeltaPct.toFixed(1)}%), com base nas evidências e regra ${input.ruleId ?? "n/d"} v${input.version ?? "?"}.`,
      evidence: input.evidence,
      confidence: "media",
      limitations: ["Não constitui parecer fiscal"],
      deepLinks: [
        `/${input.tenantSlug}/tributario/executivo`,
        `/${input.tenantSlug}/tributario/regras`,
      ],
      mode: "deterministic",
    };
  }
  if (input.intent === "create_tax_action_plan") {
    return {
      intent: input.intent,
      answer:
        "Rascunho de plano disponível — exige validação profissional; sem execução automática.",
      evidence: input.evidence,
      confidence: "media",
      limitations: ["autoExecute=false"],
      deepLinks: [`/${input.tenantSlug}/tributario/executivo`],
      mode: "deterministic",
    };
  }
  return {
    intent: input.intent,
    answer: "Análise determinística com as evidências fornecidas.",
    evidence: input.evidence,
    confidence: "media",
    limitations: ["Modo deterministic — sem provider externo"],
    deepLinks: [`/${input.tenantSlug}/tributario`],
    mode: "deterministic",
  };
}

export type TaxReportKind =
  | "resumo"
  | "carga_periodo"
  | "carga_empresa"
  | "carga_filial"
  | "creditos"
  | "retencoes"
  | "obrigacoes"
  | "vigencias"
  | "versoes"
  | "regras_sem_fonte"
  | "conflitos"
  | "simulacoes"
  | "comparativo_regimes"
  | "projecoes"
  | "auditoria";

export function listTaxReportKinds(): TaxReportKind[] {
  return [
    "resumo",
    "carga_periodo",
    "carga_empresa",
    "carga_filial",
    "creditos",
    "retencoes",
    "obrigacoes",
    "vigencias",
    "versoes",
    "regras_sem_fonte",
    "conflitos",
    "simulacoes",
    "comparativo_regimes",
    "projecoes",
    "auditoria",
  ];
}

export function buildExecutiveCockpitSkeleton(input: {
  period: string;
  coveragePct: number | null;
  lastUpdate: string | null;
}): {
  period: string;
  burden: number | null;
  effectiveRate: number | null;
  confidence: TaxConfidenceLevel;
  coverage: number | null;
  disclaimer: string;
} {
  return {
    period: input.period,
    burden: null,
    effectiveRate: null,
    confidence:
      input.coveragePct == null
        ? "indisponivel"
        : input.coveragePct >= 80
          ? "media"
          : "baixa",
    coverage: input.coveragePct,
    disclaimer:
      "Valores somente com fonte/regra/versão. Sem dados configurados, campos permanecem nulos.",
  };
}
