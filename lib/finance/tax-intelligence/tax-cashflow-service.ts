/**
 * Sprint 26.7 — Fluxo de caixa tributário (integra com horizontes do Cash Intelligence).
 * Projeta outflows a partir de apurações — sem inventar calendário fiscal hardcoded.
 */

import { addMonths, roundMoney, todayUtc } from "./money-utils.ts";
import type {
  TaxCashflowProjection,
  TaxCashflowScenario,
  TaxComputationResult,
} from "./types.ts";

const SCENARIO_FACTORS: Record<TaxCashflowScenario, number> = {
  optimistic: 0.9,
  neutral: 1,
  conservative: 1.15,
};

/**
 * Due day e sazonalidade vêm de `schedule` configurável (parâmetros),
 * nunca de datas fiscais fixas no código.
 */
export function projectTaxCashflow(args: {
  tenantId: string;
  assessments: TaxComputationResult[];
  scenario: TaxCashflowScenario;
  months?: number;
  from?: string;
  /** Dia do mês para vencimento projetado (configurável). */
  dueDayOfMonth?: number;
  /** Fatores mensais de sazonalidade (length = months); default 1. */
  seasonality?: number[];
}): TaxCashflowProjection {
  const from = args.from ?? todayUtc();
  const months = args.months ?? 6;
  const dueDay = Math.min(28, Math.max(1, args.dueDayOfMonth ?? 20));
  const factor = SCENARIO_FACTORS[args.scenario];
  const monthlyBase = roundMoney(
    args.assessments.reduce((s, a) => s + a.totalTax, 0) /
      Math.max(1, new Set(args.assessments.map((a) => a.period)).size || 1),
  );

  const points = [];
  let peak = 0;
  let peakDate: string | null = null;
  let total = 0;

  for (let i = 0; i < months; i++) {
    const monthStart = addMonths(from.slice(0, 8) + "01", i);
    const y = Number(monthStart.slice(0, 4));
    const m = Number(monthStart.slice(5, 7));
    const date = `${y}-${String(m).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
    const season = args.seasonality?.[i] ?? 1;
    const taxOutflow = roundMoney(monthlyBase * factor * season);
    total = roundMoney(total + taxOutflow);
    if (taxOutflow >= peak) {
      peak = taxOutflow;
      peakDate = date;
    }
    points.push({
      date,
      taxOutflow,
      cashImpact: -taxOutflow,
      workingCapitalImpact: -taxOutflow,
      dueLabel: `Vencimento projetado (dia ${dueDay}, cenário ${args.scenario})`,
    });
  }

  return {
    tenantId: args.tenantId,
    scenario: args.scenario,
    from,
    to: points[points.length - 1]?.date ?? from,
    points,
    totalTaxOutflow: total,
    peakOutflow: peak,
    peakDate,
    seasonalityNote: args.seasonality?.length
      ? "Sazonalidade aplicada via fatores configurados."
      : "Sem sazonalidade explícita — fator mensal neutro.",
    methodology:
      "Projeção a partir da média das apurações parametrizadas × fator de cenário. Dia de vencimento configurável — sem calendário fiscal hardcoded.",
    confidence: args.assessments.length ? "medium" : "low",
  };
}
