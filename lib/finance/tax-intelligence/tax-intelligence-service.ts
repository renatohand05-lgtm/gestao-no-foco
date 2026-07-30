/**
 * Sprint 26.7 — Orquestrador Tax Intelligence.
 */

import { buildTaxAlerts } from "./tax-alerts-service.ts";
import { buildTaxAiRecommendations } from "./tax-ai-service.ts";
import { projectTaxCashflow } from "./tax-cashflow-service.ts";
import {
  buildExecutiveTaxDashboard,
  buildTaxDrillDown,
  computeAssessments,
} from "./tax-dashboard-service.ts";
import { describeTaxIntegrationArchitecture } from "./tax-integration-architecture.ts";
import {
  buildTaxEnterpriseReport,
  prepareTaxReportExport,
} from "./tax-reports-service.ts";
import { simulateTaxScenario } from "./tax-simulator-service.ts";
import { rankTaxSuppliers } from "./tax-supplier-ranking-service.ts";
import type {
  TaxCashflowScenario,
  TaxDrillDownRequest,
  TaxIntelligenceSnapshot,
  TaxSimulationInput,
  TaxSupplierRankingWeights,
} from "./types.ts";

export function buildTaxIntelligenceBundle(
  snap: TaxIntelligenceSnapshot,
  options?: {
    cashflowScenario?: TaxCashflowScenario;
    dueDayOfMonth?: number;
    seasonality?: number[];
    ebitdaProxy?: number | null;
    supplierWeights?: TaxSupplierRankingWeights;
    simulations?: TaxSimulationInput[];
  },
) {
  const assessments = computeAssessments(snap);
  const dashboard = buildExecutiveTaxDashboard(snap, {
    projectedAssessments: snap.projectedAssessments,
  });
  const cashflow = projectTaxCashflow({
    tenantId: snap.tenantId,
    assessments,
    scenario: options?.cashflowScenario ?? "neutral",
    dueDayOfMonth: options?.dueDayOfMonth,
    seasonality: options?.seasonality,
  });
  const alerts = buildTaxAlerts({
    dashboard,
    assessments,
    cashflow,
    ebitdaProxy: options?.ebitdaProxy,
  });
  dashboard.alertsCount = alerts.length;

  const simulations = (options?.simulations ?? []).map((sim) =>
    simulateTaxScenario(sim, {
      tenantId: snap.tenantId,
      asOf: snap.asOf,
      bases: snap.bases,
      entityIds: snap.entities.map((e) => e.id),
    }),
  );

  const ai = buildTaxAiRecommendations({
    dashboard,
    assessments,
    alerts,
    simulations,
  });

  const supplierRanking = rankTaxSuppliers(
    snap.suppliers ?? [],
    options?.supplierWeights,
  );

  const report = buildTaxEnterpriseReport({
    tenantId: snap.tenantId,
    dashboard,
    alerts,
    simulations,
    cashflow,
    ai,
  });

  return {
    assessments,
    dashboard,
    cashflow,
    alerts,
    simulations,
    ai,
    supplierRanking,
    report,
    integrations: describeTaxIntegrationArchitecture(),
  };
}

export function taxIntelligenceDrillDown(
  snap: TaxIntelligenceSnapshot,
  request: TaxDrillDownRequest,
) {
  return buildTaxDrillDown(snap, request);
}

export function taxIntelligenceSimulate(
  snap: TaxIntelligenceSnapshot,
  input: TaxSimulationInput,
) {
  const assessments = computeAssessments(snap);
  return simulateTaxScenario(
    {
      ...input,
      baselineResults: input.baselineResults.length
        ? input.baselineResults
        : assessments,
    },
    {
      tenantId: snap.tenantId,
      asOf: snap.asOf,
      bases: snap.bases,
      entityIds: snap.entities.map((e) => e.id),
    },
  );
}

export { prepareTaxReportExport };
