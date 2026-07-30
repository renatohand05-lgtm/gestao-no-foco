/**
 * Sprint 22.6.2 — Projeção de caixa 30/60/90/365 (+ custom).
 */

import type {
  CashFlowLine,
  CashLayersResult,
  CashProjectionPoint,
  CashProjectionResult,
  CashProjectionView,
} from "./types.ts";
import { addDays, eachDay, roundMoney, toDateOnly, todayUtc } from "./date-utils.ts";

function filterByView(
  lines: CashFlowLine[],
  view: CashProjectionView,
  viewId?: string | null,
): CashFlowLine[] {
  if (view === "consolidated" || !viewId) return lines;
  if (view === "account") {
    return lines.filter((l) => l.bankAccountId === viewId);
  }
  if (view === "cost_center") {
    return lines.filter((l) => l.costCenterId === viewId);
  }
  if (view === "category") {
    return lines.filter((l) => l.categoryId === viewId);
  }
  if (view === "dre_group") {
    return lines.filter((l) => l.dreGroup === viewId);
  }
  return lines;
}

function applyDay(
  balance: number,
  lines: CashFlowLine[],
): {
  closing: number;
  inflows: number;
  outflows: number;
  layerBreakdown: CashProjectionPoint["layerBreakdown"];
} {
  let inflows = 0;
  let outflows = 0;
  const layerBreakdown = {
    realizedIn: 0,
    realizedOut: 0,
    forecastIn: 0,
    forecastOut: 0,
    projectedIn: 0,
    projectedOut: 0,
  };

  for (const l of lines) {
    if (l.status === "transfer") continue;
    if (l.direction === "in") {
      inflows += l.amount;
      if (l.layer === "realized") layerBreakdown.realizedIn += l.amount;
      if (l.layer === "forecast") layerBreakdown.forecastIn += l.amount;
      if (l.layer === "projected") layerBreakdown.projectedIn += l.amount;
    } else {
      outflows += l.amount;
      if (l.layer === "realized") layerBreakdown.realizedOut += l.amount;
      if (l.layer === "forecast") layerBreakdown.forecastOut += l.amount;
      if (l.layer === "projected") layerBreakdown.projectedOut += l.amount;
    }
  }

  return {
    closing: roundMoney(balance + inflows - outflows),
    inflows: roundMoney(inflows),
    outflows: roundMoney(outflows),
    layerBreakdown: {
      realizedIn: roundMoney(layerBreakdown.realizedIn),
      realizedOut: roundMoney(layerBreakdown.realizedOut),
      forecastIn: roundMoney(layerBreakdown.forecastIn),
      forecastOut: roundMoney(layerBreakdown.forecastOut),
      projectedIn: roundMoney(layerBreakdown.projectedIn),
      projectedOut: roundMoney(layerBreakdown.projectedOut),
    },
  };
}

export function projectCashflow(input: {
  tenantId: string;
  openingBalance: number;
  layers: CashLayersResult;
  horizonDays: number;
  from?: string;
  view?: CashProjectionView;
  viewId?: string | null;
}): CashProjectionResult {
  const horizonDays = Math.max(1, Math.floor(input.horizonDays));
  const from = toDateOnly(input.from ?? todayUtc());
  const to = addDays(from, horizonDays - 1);
  const view = input.view ?? "consolidated";

  const allLines = filterByView(
    [
      ...input.layers.realized,
      ...input.layers.forecast,
      ...input.layers.projected,
    ].filter((l) => l.date >= from && l.date <= to),
    view,
    input.viewId,
  );

  const byDate = new Map<string, CashFlowLine[]>();
  for (const l of allLines) {
    const arr = byDate.get(l.date) ?? [];
    arr.push(l);
    byDate.set(l.date, arr);
  }

  const points: CashProjectionPoint[] = [];
  let balance = input.openingBalance;
  let minBalance = balance;
  let maxBalance = balance;
  let minBalanceDate: string | null = from;
  let maxBalanceDate: string | null = from;
  let negativeDays = 0;
  let ruptureDate: string | null = null;
  let projectedInflows = 0;
  let projectedOutflows = 0;

  for (const day of eachDay(from, to)) {
    const opening = balance;
    const dayResult = applyDay(balance, byDate.get(day) ?? []);
    balance = dayResult.closing;
    projectedInflows += dayResult.inflows;
    projectedOutflows += dayResult.outflows;
    if (balance < minBalance) {
      minBalance = balance;
      minBalanceDate = day;
    }
    if (balance > maxBalance) {
      maxBalance = balance;
      maxBalanceDate = day;
    }
    if (balance < 0) {
      negativeDays += 1;
      if (!ruptureDate) ruptureDate = day;
    }
    points.push({
      date: day,
      opening: roundMoney(opening),
      inflows: dayResult.inflows,
      outflows: dayResult.outflows,
      closing: dayResult.closing,
      layerBreakdown: dayResult.layerBreakdown,
    });
  }

  const insufficientData =
    input.layers.confidence === "low" &&
    input.layers.forecast.length === 0 &&
    input.layers.projected.length === 0;

  return {
    tenantId: input.tenantId,
    horizonDays,
    from,
    to,
    view,
    openingBalance: roundMoney(input.openingBalance),
    projectedInflows: roundMoney(projectedInflows),
    projectedOutflows: roundMoney(projectedOutflows),
    closingBalance: roundMoney(balance),
    minBalance: roundMoney(minBalance),
    maxBalance: roundMoney(maxBalance),
    minBalanceDate,
    maxBalanceDate,
    negativeDays,
    ruptureDate,
    capitalNeed: roundMoney(Math.max(0, -minBalance)),
    points: insufficientData ? [] : points,
    confidence: insufficientData ? "low" : input.layers.confidence,
    confidenceReason: insufficientData
      ? "Dados insuficientes — projeção não fabricada."
      : input.layers.confidenceReason,
    insufficientData,
  };
}
