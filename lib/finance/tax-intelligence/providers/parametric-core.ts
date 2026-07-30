/**
 * Sprint 26.7 — Núcleo de cálculo parametrizado (compartilhado pelos providers).
 */

import { requireNumberParameter } from "../tax-rule-registry.ts";
import { roundMoney, safeRatio } from "../money-utils.ts";
import type {
  TaxBaseLine,
  TaxComputationInput,
  TaxComputationResult,
  TaxComponentResult,
} from "../types.ts";
import type { TaxRegimeProvider } from "./types.ts";

function sumBases(bases: TaxBaseLine[], kind: TaxBaseLine["kind"]): number {
  return roundMoney(
    bases.filter((b) => b.kind === kind).reduce((s, b) => s + b.amount, 0),
  );
}

export function createParametricProvider(
  code: TaxRegimeProvider["code"],
  label: string,
  options: {
    componentCode: string;
    componentLabel: string;
    /** Se true, aplica presumption_rate sobre receita antes da alíquota. */
    usePresumption?: boolean;
    /** Se true, deduz credit_rate * credits da base. */
    useCredits?: boolean;
  },
): TaxRegimeProvider {
  return {
    code,
    label,
    compute(input: TaxComputationInput): TaxComputationResult {
      const rule = input.ruleVersion;
      if (rule.regimeCode !== code && code !== "custom") {
        throw new Error(
          `Provider ${code} recebeu regra de regime ${rule.regimeCode}.`,
        );
      }

      const rate = requireNumberParameter(
        rule.parameters,
        "rate_effective",
        rule.versionLabel,
      );
      const baseMultiplier = requireNumberParameter(
        rule.parameters,
        "base_multiplier",
        rule.versionLabel,
      );

      const revenue = sumBases(input.bases, "revenue");
      const deductions = sumBases(input.bases, "deduction");
      const credits = sumBases(input.bases, "credit");
      const expenses = sumBases(input.bases, "expense");

      const keysUsed = ["rate_effective", "base_multiplier"];
      let taxable = roundMoney((revenue - deductions) * baseMultiplier);

      if (options.usePresumption) {
        const presumption = requireNumberParameter(
          rule.parameters,
          "presumption_rate",
          rule.versionLabel,
        );
        keysUsed.push("presumption_rate");
        taxable = roundMoney(taxable * presumption);
      }

      if (options.useCredits) {
        const creditRate = requireNumberParameter(
          rule.parameters,
          "credit_rate",
          rule.versionLabel,
        );
        keysUsed.push("credit_rate");
        taxable = roundMoney(taxable - credits * creditRate);
      }

      // Lucro real: despesas podem reduzir base se parâmetro allow_expense_deduction=1
      if (
        code === "lucro_real" &&
        rule.parameters.allow_expense_deduction === true
      ) {
        taxable = roundMoney(taxable - expenses);
        keysUsed.push("allow_expense_deduction");
      }

      if (taxable < 0) taxable = 0;

      const amount = roundMoney(taxable * rate);
      const component: TaxComponentResult = {
        code: options.componentCode,
        label: options.componentLabel,
        baseAmount: taxable,
        rateApplied: rate,
        amount,
        parameterKeysUsed: keysUsed,
        explanation: `Base ${taxable} × rate_effective ${rate} (regra ${rule.versionLabel}). Parâmetros: ${keysUsed.join(", ")}.`,
      };

      return {
        tenantId: input.tenantId,
        entityId: input.entityId,
        period: input.period,
        regimeCode: code,
        ruleVersionId: rule.id,
        ruleVersionLabel: rule.versionLabel,
        components: [component],
        totalTax: amount,
        effectiveRate: safeRatio(amount, revenue),
        taxableBase: taxable,
        methodology: `${label}: cálculo 100% parametrizado via tax_rule_versions — sem alíquotas hardcoded.`,
        confidence: keysUsed.length >= 2 ? "high" : "medium",
        confidenceReason: `Parâmetros resolvidos da versão ${rule.versionLabel}.`,
      };
    },
  };
}
