/**
 * Sprint 22.6.2 — Orquestrador Cash Intelligence (leitura pura a partir de snapshots).
 */

import type { BankAccount, CashMovement } from "../shared/types.ts";
import { computeConsolidatedBalance } from "./consolidated-balance-service.ts";
import { buildCashLayers } from "./cashflow-layers-service.ts";
import { projectCashflow } from "./cashflow-projection-service.ts";
import { buildCashRiskAlerts } from "./cash-risk-service.ts";
import { computeWorkingCapital } from "./working-capital-service.ts";
import { buildDrillDown } from "./drill-down-service.ts";
import { buildRescheduleRecommendations } from "./payment-rescheduling-service.ts";
import { simulateScenario } from "./scenario-simulator-service.ts";
import { addDays, todayUtc } from "./date-utils.ts";
import type {
  CashIntelligenceHorizonDays,
  CashProjectionView,
  ExecutiveCashDashboard,
  OpenTitleSnapshot,
  RecurringSnapshot,
  ScenarioInput,
} from "./types.ts";

export type CashIntelligenceSnapshot = {
  tenantId: string;
  tenantSlug: string;
  accounts: BankAccount[];
  movements: CashMovement[];
  openTitles: OpenTitleSnapshot[];
  recurring?: RecurringSnapshot[];
};

export function buildExecutiveCashDashboard(
  snap: CashIntelligenceSnapshot,
  options?: {
    horizonDays?: CashIntelligenceHorizonDays;
    periodFrom?: string;
    periodTo?: string;
    view?: CashProjectionView;
    viewId?: string | null;
    includeProjectedTrend?: boolean;
  },
): ExecutiveCashDashboard {
  const horizonDays = options?.horizonDays ?? 30;
  const from = options?.periodFrom ?? todayUtc();
  const to = options?.periodTo ?? addDays(from, horizonDays - 1);

  const balance = computeConsolidatedBalance({
    tenantId: snap.tenantId,
    accounts: snap.accounts,
    openPayables: snap.openTitles.filter((t) => t.kind === "payable"),
  });

  const layers = buildCashLayers({
    tenantId: snap.tenantId,
    from,
    to,
    openingBalance: balance.consolidated,
    movements: snap.movements,
    openTitles: snap.openTitles,
    recurring: snap.recurring,
    includeProjectedTrend: options?.includeProjectedTrend,
  });

  const projection = projectCashflow({
    tenantId: snap.tenantId,
    openingBalance: balance.consolidated,
    layers,
    horizonDays,
    from,
    view: options?.view,
    viewId: options?.viewId,
  });

  const workingCapital = computeWorkingCapital({
    tenantId: snap.tenantId,
    projection,
    openTitles: snap.openTitles,
  });

  const alerts = buildCashRiskAlerts({
    tenantSlug: snap.tenantSlug,
    projection,
    openTitles: snap.openTitles,
    consolidatedBalance: balance.consolidated,
  });

  const receivablesOpen = snap.openTitles
    .filter((t) => t.kind === "receivable" && t.amountPending > 0)
    .reduce((s, t) => s + t.amountPending, 0);
  const payablesOpen = snap.openTitles
    .filter((t) => t.kind === "payable" && t.amountPending > 0)
    .reduce((s, t) => s + t.amountPending, 0);

  return {
    tenantId: snap.tenantId,
    asOf: balance.asOf,
    balance,
    periodInflows: layers.totals.realizedIn,
    periodOutflows: layers.totals.realizedOut,
    periodNet: layers.totals.realizedIn - layers.totals.realizedOut,
    receivablesOpen,
    payablesOpen,
    workingCapital,
    projection,
    alerts,
    layers,
  };
}

export function cashIntelligenceDrillDown(
  snap: CashIntelligenceSnapshot,
  indicatorKey: string,
  indicatorLabel: string,
  from: string,
  to: string,
) {
  const layers = buildCashLayers({
    tenantId: snap.tenantId,
    from,
    to,
    openingBalance: 0,
    movements: snap.movements,
    openTitles: snap.openTitles,
    recurring: snap.recurring,
    includeProjectedTrend: false,
  });
  return buildDrillDown({
    indicatorKey,
    indicatorLabel,
    periodFrom: from,
    periodTo: to,
    accounts: snap.accounts,
    lines: [...layers.realized, ...layers.forecast],
    movements: snap.movements,
    titles: snap.openTitles,
  });
}

export function cashIntelligenceRecommendations(snap: CashIntelligenceSnapshot, horizonDays = 30) {
  const dash = buildExecutiveCashDashboard(snap, { horizonDays });
  return buildRescheduleRecommendations({
    projection: dash.projection,
    openTitles: snap.openTitles,
    consolidatedBalance: dash.balance.consolidated,
  });
}

export function cashIntelligenceSimulate(
  snap: CashIntelligenceSnapshot,
  scenario: ScenarioInput,
) {
  const dash = buildExecutiveCashDashboard(snap, {
    horizonDays: scenario.horizonDays,
    includeProjectedTrend: false,
  });
  return simulateScenario({
    tenantId: snap.tenantId,
    openingBalance: dash.balance.consolidated,
    baseLayers: dash.layers,
    scenario,
  });
}
