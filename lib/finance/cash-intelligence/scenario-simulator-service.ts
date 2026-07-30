/**
 * Sprint 22.6.2 — Simulador de investimentos e empréstimos (em memória).
 * Cenários ficam separados dos dados reais até confirmação explícita (não aplicada aqui).
 */

import type {
  CashFlowLine,
  LoanScenarioInput,
  ScenarioComparison,
  ScenarioInput,
} from "./types.ts";
import { addDays, roundMoney, toDateOnly } from "./date-utils.ts";
import { projectCashflow } from "./cashflow-projection-service.ts";
import type { CashLayersResult } from "./types.ts";

const DISCLAIMER =
  "Cenário simulado — separado dos dados reais. Nenhuma movimentação foi criada.";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function investmentLines(
  tenantId: string,
  input: Extract<ScenarioInput, { kind: "investment" }>,
  scenarioId: string,
): CashFlowLine[] {
  const lines: CashFlowLine[] = [];
  const installments = Math.max(1, input.installments ?? 1);
  const parcel = roundMoney(input.amount / installments);
  for (let i = 0; i < installments; i += 1) {
    const date = addDays(toDateOnly(input.disbursementDate), i * 30);
    lines.push({
      id: `${scenarioId}-out-${i}`,
      tenantId,
      layer: "projected",
      date,
      amount: parcel,
      direction: "out",
      description: `${input.name} · desembolso ${i + 1}/${installments}`,
      bankAccountId: null,
      categoryId: null,
      costCenterId: null,
      dreGroup: null,
      status: "scenario",
      origin: { kind: "scenario", id: scenarioId, label: input.name },
    });
  }
  if (input.extraInflows && input.extraInflows > 0) {
    lines.push({
      id: `${scenarioId}-in`,
      tenantId,
      layer: "projected",
      date: toDateOnly(input.effectsStartDate ?? input.disbursementDate),
      amount: input.extraInflows,
      direction: "in",
      description: `${input.name} · receitas adicionais estimadas`,
      bankAccountId: null,
      categoryId: null,
      costCenterId: null,
      dreGroup: null,
      status: "scenario",
      origin: { kind: "scenario", id: scenarioId, label: input.name },
    });
  }
  if (input.extraOutflows && input.extraOutflows > 0) {
    lines.push({
      id: `${scenarioId}-xout`,
      tenantId,
      layer: "projected",
      date: toDateOnly(input.effectsStartDate ?? input.disbursementDate),
      amount: input.extraOutflows,
      direction: "out",
      description: `${input.name} · despesas adicionais estimadas`,
      bankAccountId: null,
      categoryId: null,
      costCenterId: null,
      dreGroup: null,
      status: "scenario",
      origin: { kind: "scenario", id: scenarioId, label: input.name },
    });
  }
  return lines;
}

function loanLines(
  tenantId: string,
  input: LoanScenarioInput,
  scenarioId: string,
): CashFlowLine[] {
  const lines: CashFlowLine[] = [];
  const release = toDateOnly(input.releaseDate);
  lines.push({
    id: `${scenarioId}-principal`,
    tenantId,
    layer: "projected",
    date: release,
    amount: input.principal,
    direction: "in",
    description: `${input.name} · liberação`,
    bankAccountId: null,
    categoryId: null,
    costCenterId: null,
    dreGroup: null,
    status: "scenario",
    origin: { kind: "scenario", id: scenarioId, label: input.name },
  });
  if (input.extraCosts && input.extraCosts > 0) {
    lines.push({
      id: `${scenarioId}-costs`,
      tenantId,
      layer: "projected",
      date: release,
      amount: input.extraCosts,
      direction: "out",
      description: `${input.name} · custos adicionais`,
      bankAccountId: null,
      categoryId: null,
      costCenterId: null,
      dreGroup: null,
      status: "scenario",
      origin: { kind: "scenario", id: scenarioId, label: input.name },
    });
  }

  const grace = Math.max(0, input.graceMonths ?? 0);
  const first =
    input.firstInstallmentDate ??
    addDays(release, (grace + 1) * 30);
  const rate = Math.max(0, input.rateMonthlyPct) / 100;
  // Sistema price simplificado (parcela fixa aproximada)
  const n = Math.max(1, input.installments);
  const factor =
    rate === 0 ? 1 / n : (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
  const parcel = roundMoney(input.principal * factor);

  for (let i = 0; i < n; i += 1) {
    lines.push({
      id: `${scenarioId}-parc-${i}`,
      tenantId,
      layer: "projected",
      date: addDays(toDateOnly(first), i * 30),
      amount: parcel,
      direction: "out",
      description: `${input.name} · parcela ${i + 1}/${n}`,
      bankAccountId: null,
      categoryId: null,
      costCenterId: null,
      dreGroup: null,
      status: "scenario",
      origin: { kind: "scenario", id: scenarioId, label: input.name },
    });
  }
  return lines;
}

export function simulateScenario(input: {
  tenantId: string;
  openingBalance: number;
  baseLayers: CashLayersResult;
  scenario: ScenarioInput;
}): ScenarioComparison {
  const scenarioId = input.scenario.id ?? newId("scn");
  const lines =
    input.scenario.kind === "investment"
      ? investmentLines(input.tenantId, input.scenario, scenarioId)
      : loanLines(input.tenantId, input.scenario, scenarioId);

  const merged: CashLayersResult = {
    ...input.baseLayers,
    projected: [...input.baseLayers.projected, ...lines],
    confidence: input.baseLayers.confidence,
    confidenceReason: `${input.baseLayers.confidenceReason} · cenário ${input.scenario.name} sobreposto (simulação).`,
  };

  const before = projectCashflow({
    tenantId: input.tenantId,
    openingBalance: input.openingBalance,
    layers: input.baseLayers,
    horizonDays: input.scenario.horizonDays,
  });
  const after = projectCashflow({
    tenantId: input.tenantId,
    openingBalance: input.openingBalance,
    layers: merged,
    horizonDays: input.scenario.horizonDays,
  });

  const totalDisbursed =
    input.scenario.kind === "investment"
      ? input.scenario.amount
      : roundMoney(
          lines
            .filter((l) => l.direction === "out")
            .reduce((s, l) => s + l.amount, 0),
        );

  const monthlyImpact = roundMoney(
    (after.closingBalance - before.closingBalance) /
      Math.max(1, input.scenario.horizonDays / 30),
  );

  return {
    scenarioId,
    name: input.scenario.name,
    kind: input.scenario.kind,
    balanceBefore: before.closingBalance,
    balanceAfter: after.closingBalance,
    minBalance: after.minBalance,
    ruptureDate: after.ruptureDate,
    capitalNeed: after.capitalNeed,
    monthlyImpact,
    totalDisbursed,
    lines,
    separatedFromReal: true,
    disclaimer: DISCLAIMER,
  };
}

export function compareScenarios(
  scenarios: ScenarioComparison[],
): ScenarioComparison[] {
  return [...scenarios].sort((a, b) => b.minBalance - a.minBalance);
}
