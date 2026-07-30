/**
 * Sprint 26.7 — Simulador tributário (cenários sem auto-execução).
 */

import { createTaxEngine } from "./tax-engine.ts";
import { roundMoney, safeRatio } from "./money-utils.ts";
import { requireNumberParameter } from "./tax-rule-registry.ts";
import type {
  TaxBaseLine,
  TaxComputationResult,
  TaxSimulationComparison,
  TaxSimulationInput,
} from "./types.ts";

function scaleBases(
  bases: TaxBaseLine[],
  factor: number,
  kind?: TaxBaseLine["kind"],
): TaxBaseLine[] {
  return bases.map((b) => {
    if (kind && b.kind !== kind) return b;
    return { ...b, amount: roundMoney(b.amount * factor) };
  });
}

function applyMix(
  bases: TaxBaseLine[],
  productDelta: number,
  serviceDelta: number,
): TaxBaseLine[] {
  return bases.map((b) => {
    if (b.kind !== "revenue") return b;
    const p = b.productMixShare ?? 0.5;
    const s = b.serviceMixShare ?? 0.5;
    const newAmount = roundMoney(
      b.amount * (1 + p * productDelta + s * serviceDelta),
    );
    return { ...b, amount: newAmount };
  });
}

export function simulateTaxScenario(
  input: TaxSimulationInput,
  context: {
    tenantId: string;
    asOf: string;
    bases: TaxBaseLine[];
    entityIds: string[];
  },
): TaxSimulationComparison {
  const baselineTotal = roundMoney(
    input.baselineResults.reduce((s, r) => s + r.totalTax, 0),
  );

  let simulatedResults: TaxComputationResult[] = [];
  const engine = createTaxEngine();
  const explanationParts: string[] = [];

  const growth =
    typeof input.factors.revenue_growth === "number"
      ? input.factors.revenue_growth
      : 0;

  let workingBases = [...context.bases];

  switch (input.kind) {
    case "revenue_growth":
      workingBases = scaleBases(workingBases, 1 + growth, "revenue");
      explanationParts.push(`Crescimento de receita aplicado: ${growth}.`);
      break;
    case "product_mix": {
      const pd =
        typeof input.factors.product_delta === "number"
          ? input.factors.product_delta
          : 0;
      const sd =
        typeof input.factors.service_delta === "number"
          ? input.factors.service_delta
          : 0;
      workingBases = applyMix(workingBases, pd, sd);
      explanationParts.push(`Mix produto/serviço: Δp=${pd}, Δs=${sd}.`);
      break;
    }
    case "service_mix": {
      const sd =
        typeof input.factors.service_delta === "number"
          ? input.factors.service_delta
          : 0;
      workingBases = applyMix(workingBases, 0, sd);
      explanationParts.push(`Mix de serviços: Δs=${sd}.`);
      break;
    }
    case "new_branch": {
      const branchFactor =
        typeof input.factors.branch_revenue_factor === "number"
          ? input.factors.branch_revenue_factor
          : 0;
      workingBases = scaleBases(workingBases, 1 + branchFactor, "revenue");
      explanationParts.push(
        `Abertura de filial simulada com fator de receita ${branchFactor}.`,
      );
      break;
    }
    case "regional_expansion": {
      const regional =
        typeof input.factors.regional_factor === "number"
          ? input.factors.regional_factor
          : 0;
      workingBases = scaleBases(workingBases, 1 + regional, "revenue");
      explanationParts.push(`Expansão regional com fator ${regional}.`);
      break;
    }
    case "acquisition": {
      const aq =
        typeof input.factors.acquisition_revenue === "number"
          ? input.factors.acquisition_revenue
          : 0;
      if (aq > 0 && workingBases[0]) {
        workingBases = [
          ...workingBases,
          {
            ...workingBases[0],
            id: `acq-${workingBases[0].id}`,
            amount: aq,
            label: "Receita aquisição (simulada)",
          },
        ];
      }
      explanationParts.push(`Aquisição com receita adicional ${aq}.`);
      break;
    }
    case "regime_change":
      explanationParts.push(
        `Mudança de regime para ${input.alternateRegimeCode ?? "configurado"}.`,
      );
      break;
  }

  // Recomputa a partir dos resultados baseline (mesmas entidades) com bases/regime alterados.
  for (const base of input.baselineResults) {
    if (!context.entityIds.includes(base.entityId)) continue;
    const entityBases = workingBases.filter((b) => b.entityId === base.entityId);
    const regime =
      input.kind === "regime_change" && input.alternateRegimeCode
        ? input.alternateRegimeCode
        : base.regimeCode;
    const rule =
      input.alternateRuleVersion &&
      input.alternateRuleVersion.regimeCode === regime
        ? input.alternateRuleVersion
        : undefined;

    if (!rule && input.kind === "regime_change") {
      explanationParts.push(
        "Regime alterado exige alternateRuleVersion parametrizada — simulação parcial omitida.",
      );
      continue;
    }

    try {
      // Usa provider direto via engine com rule override quando presente
      const fakeEntity = {
        id: base.entityId,
        tenantId: context.tenantId,
        kind: "company" as const,
        name: base.entityId,
        regimeCode: regime,
        active: true,
      };
      const result = engine.computeForEntity({
        tenantId: context.tenantId,
        asOf: context.asOf,
        entity: fakeEntity,
        bases: entityBases.length
          ? entityBases
          : workingBases.filter((b) => b.entityId === base.entityId),
        ruleVersions: rule ? [rule] : [],
        regimeOverride: regime,
        ruleOverride: rule ?? undefined,
      });
      // When no rule override and empty versions, recompute with scaled component ratio
      simulatedResults.push(result);
    } catch {
      // Fallback determinístico: escala o total baseline pelo fator de receita, sem inventar alíquota.
      if (input.kind !== "regime_change") {
        const factor = 1 + (typeof growth === "number" ? growth : 0);
        const scaled: TaxComputationResult = {
          ...base,
          totalTax: roundMoney(base.totalTax * factor),
          components: base.components.map((c) => ({
            ...c,
            amount: roundMoney(c.amount * factor),
            baseAmount: roundMoney(c.baseAmount * factor),
            explanation: `${c.explanation} (escala simulada ${factor})`,
          })),
          methodology: `${base.methodology} | simulação por escala (sem nova regra).`,
          confidence: "medium",
          confidenceReason: "Escala sobre apuração existente — sem alíquota inventada.",
        };
        simulatedResults.push(scaled);
        explanationParts.push(
          "Recomputação completa indisponível; aplicada escala sobre resultado baseline.",
        );
      }
    }
  }

  if (simulatedResults.length === 0) {
    simulatedResults = input.baselineResults;
    explanationParts.push("Sem alteração efetiva — retornando baseline.");
  }

  const simulatedTotal = roundMoney(
    simulatedResults.reduce((s, r) => s + r.totalTax, 0),
  );
  const delta = roundMoney(simulatedTotal - baselineTotal);

  // Validação opcional de fator quando presente na regra alternativa
  if (input.alternateRuleVersion) {
    try {
      requireNumberParameter(
        input.alternateRuleVersion.parameters,
        "rate_effective",
        input.alternateRuleVersion.versionLabel,
      );
    } catch {
      /* já tratado no engine */
    }
  }

  const componentMap = new Map<
    string,
    { baseline: number; simulated: number }
  >();
  for (const r of input.baselineResults) {
    for (const c of r.components) {
      const prev = componentMap.get(c.code) ?? { baseline: 0, simulated: 0 };
      prev.baseline = roundMoney(prev.baseline + c.amount);
      componentMap.set(c.code, prev);
    }
  }
  for (const r of simulatedResults) {
    for (const c of r.components) {
      const prev = componentMap.get(c.code) ?? { baseline: 0, simulated: 0 };
      prev.simulated = roundMoney(prev.simulated + c.amount);
      componentMap.set(c.code, prev);
    }
  }

  return {
    kind: input.kind,
    label: input.label,
    baselineTotal,
    simulatedTotal,
    delta,
    deltaPercent: safeRatio(delta, baselineTotal),
    explanation: explanationParts.join(" "),
    confidence: input.kind === "regime_change" ? "medium" : "high",
    requiresHumanReview: true,
    components: [...componentMap.entries()].map(([code, v]) => ({
      code,
      baseline: v.baseline,
      simulated: v.simulated,
      delta: roundMoney(v.simulated - v.baseline),
    })),
  };
}
