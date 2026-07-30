/**
 * Sprint 26.7 — Alertas inteligentes (nunca auto-aplicados).
 */

import { roundMoney, safeRatio } from "./money-utils.ts";
import type {
  ExecutiveTaxDashboard,
  TaxAlert,
  TaxCashflowProjection,
  TaxComputationResult,
} from "./types.ts";

export function buildTaxAlerts(args: {
  dashboard: ExecutiveTaxDashboard;
  assessments: TaxComputationResult[];
  cashflow?: TaxCashflowProjection | null;
  /** Limiar configurável de spike (ex.: 0.2 = 20%). */
  loadSpikeThreshold?: number;
  upcomingDays?: number;
  ebitdaProxy?: number | null;
}): TaxAlert[] {
  const alerts: TaxAlert[] = [];
  const spikeThreshold = args.loadSpikeThreshold ?? 0.2;
  const upcomingDays = args.upcomingDays ?? 15;

  const trend = args.dashboard.monthlyTrend;
  if (trend.length >= 2) {
    const prev = trend[trend.length - 2]!;
    const curr = trend[trend.length - 1]!;
    const change = safeRatio(curr.realized - prev.realized, prev.realized || 1);
    if (change != null && change >= spikeThreshold) {
      alerts.push({
        id: "alert-load-spike",
        kind: "load_spike",
        severity: change >= 0.4 ? "critical" : "warning",
        title: "Aumento inesperado da carga tributária",
        message: `Variação de ${(change * 100).toFixed(1)}% entre ${prev.period} e ${curr.period} (limiar ${(spikeThreshold * 100).toFixed(0)}%).`,
        amount: roundMoney(curr.realized - prev.realized),
        origin: "tax-alerts/load-spike",
        confidence: "high",
        requiresHumanReview: true,
        autoApplied: false,
      });
    }
  }

  if (args.cashflow?.points.length) {
    const soon = args.cashflow.points[0]!;
    alerts.push({
      id: `alert-due-${soon.date}`,
      kind: "upcoming_due",
      severity: "info",
      title: "Vencimento tributário projetado próximo",
      message: `Outflow estimado ${soon.taxOutflow} em ${soon.date} (horizonte ${upcomingDays}d configurável).`,
      amount: soon.taxOutflow,
      origin: "tax-alerts/cashflow",
      confidence: args.cashflow.confidence,
      requiresHumanReview: true,
      autoApplied: false,
    });

    if (args.cashflow.peakOutflow > 0) {
      alerts.push({
        id: "alert-cashflow-impact",
        kind: "cashflow_impact",
        severity: "warning",
        title: "Impacto no fluxo de caixa",
        message: `Pico de outflow tributário ${args.cashflow.peakOutflow} em ${args.cashflow.peakDate}.`,
        amount: args.cashflow.peakOutflow,
        origin: "tax-alerts/cashflow-peak",
        confidence: "medium",
        requiresHumanReview: true,
        autoApplied: false,
      });
    }
  }

  if (args.dashboard.emptyReason) {
    alerts.push({
      id: "alert-inconsistency-config",
      kind: "inconsistency",
      severity: "warning",
      title: "Inconsistência / configuração incompleta",
      message: args.dashboard.emptyReason,
      origin: "tax-alerts/config",
      confidence: "high",
      requiresHumanReview: true,
      autoApplied: false,
    });
  }

  if (args.dashboard.reformImpact.regimesInScope.length > 0) {
    alerts.push({
      id: "alert-legal-reform",
      kind: "legal_change",
      severity: "info",
      title: "Alterações legais futuras (Reforma)",
      message: args.dashboard.reformImpact.summary,
      amount: args.dashboard.reformImpact.projectedDelta,
      origin: "tax-alerts/reform",
      confidence: args.dashboard.reformImpact.confidence,
      requiresHumanReview: true,
      autoApplied: false,
    });
  }

  for (const opp of args.dashboard.opportunities.slice(0, 5)) {
    alerts.push({
      id: `alert-opp-${opp.id}`,
      kind: "savings_opportunity",
      severity: "info",
      title: opp.title,
      message: opp.explanation,
      amount: opp.estimatedImpact,
      origin: opp.origin,
      confidence: opp.confidence,
      requiresHumanReview: true,
      autoApplied: false,
    });
  }

  const highRate = args.assessments.filter(
    (a) => a.effectiveRate != null && a.effectiveRate > 0.3,
  );
  if (highRate.length) {
    alerts.push({
      id: "alert-fiscal-risk",
      kind: "fiscal_risk",
      severity: "warning",
      title: "Risco fiscal — carga efetiva elevada",
      message: `${highRate.length} entidade(s) com carga efetiva > 30% (limiar analítico, não alíquota legal).`,
      origin: "tax-alerts/effective-rate",
      confidence: "medium",
      requiresHumanReview: true,
      autoApplied: false,
    });
  }

  if (args.ebitdaProxy != null && args.ebitdaProxy !== 0) {
    const impact = safeRatio(args.dashboard.consolidatedLoad, args.ebitdaProxy);
    if (impact != null) {
      alerts.push({
        id: "alert-ebitda",
        kind: "ebitda_impact",
        severity: impact > 0.4 ? "warning" : "info",
        title: "Impacto em EBITDA (proxy)",
        message: `Carga consolidada representa ${(impact * 100).toFixed(1)}% do EBITDA proxy informado.`,
        amount: args.dashboard.consolidatedLoad,
        origin: "tax-alerts/ebitda",
        confidence: "low",
        requiresHumanReview: true,
        autoApplied: false,
      });
    }
  }

  return alerts;
}
