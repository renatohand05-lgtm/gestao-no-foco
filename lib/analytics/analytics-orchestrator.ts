/**
 * Fase 23 — Orquestrador Analytics Experience.
 */

import type { AnalyticsDomainSnapshot } from "./core/analytics-context.ts";
import {
  buildComparisons,
  buildMetricDrillDownFromSnapshot,
  buildTargetForMetric,
  buildTrendForMetric,
  resolveCatalogMetrics,
} from "./core/analytics-engine.ts";
import { emptyFilter, resolvePeriodPreset, sanitizeMetricFilter } from "./core/filter-engine.ts";
import type {
  AnalyticsContext,
  AnalyticsExportStatus,
  AnalyticsPeriodPreset,
  MetricFilter,
} from "./core/metric-types.ts";
import { buildAnalyticsAlerts } from "./insights/alert-engine.ts";
import {
  resolveExecutiveProvider,
} from "./providers/executive-intelligence-provider.ts";
import {
  getAnalyticsFeatureFlags,
  isAnalyticsExportExcelEnabled,
  isAnalyticsExportPdfEnabled,
} from "./analytics-feature-flags.ts";
import { mergeAnalyticsLayout } from "./persistence/dashboard-layout-store.ts";

export function buildAnalyticsExportStatuses(): AnalyticsExportStatus[] {
  return [
    {
      format: "csv",
      status: "ready",
      message: "CSV seguro a partir de MetricResult (sem dados de outro tenant).",
    },
    {
      format: "excel",
      status: isAnalyticsExportExcelEnabled() ? "ready" : "preparing",
      featureFlag: "ANALYTICS_EXPORT_EXCEL_ENABLED",
      message: isAnalyticsExportExcelEnabled()
        ? "Excel habilitado"
        : "Em preparação",
    },
    {
      format: "pdf",
      status: isAnalyticsExportPdfEnabled() ? "ready" : "preparing",
      featureFlag: "ANALYTICS_EXPORT_PDF_ENABLED",
      message: isAnalyticsExportPdfEnabled() ? "PDF habilitado" : "Em preparação",
    },
    {
      format: "print",
      status: "ready",
      message: "Layout de impressão CSS (sem renderer PDF).",
    },
  ];
}

export function buildExecutiveAnalyticsBundle(args: {
  snap: AnalyticsDomainSnapshot;
  permissions: readonly string[];
  periodPreset?: AnalyticsPeriodPreset;
  customFrom?: string;
  customTo?: string;
  filters?: Omit<MetricFilter, "period">;
  layout?: Parameters<typeof mergeAnalyticsLayout>[0];
}) {
  const period = resolvePeriodPreset(args.periodPreset ?? "last_30", {
    customFrom: args.customFrom,
    customTo: args.customTo,
  });
  const filters: MetricFilter = sanitizeMetricFilter({
    period,
    raw: {
      ...(args.filters ?? {}),
      period,
    },
  });

  const context: AnalyticsContext = {
    tenantId: args.snap.tenantId,
    tenantSlug: args.snap.tenantSlug,
    userId: null,
    permissions: args.permissions,
    filters,
    asOf: args.snap.asOf,
  };

  const metrics = resolveCatalogMetrics(args.snap, {
    period,
    filters,
    permissions: args.permissions,
  });

  const priorityIds = [
    "fin.receita_bruta",
    "fin.receita_liquida",
    "fin.ebitda",
    "fin.margem_ebitda",
    "fin.lucro_liquido",
    "fin.saldo_consolidado",
    "fin.capital_giro",
    "vendas.ticket_medio",
    "vendas.faturamento",
    "vendas.quantidade",
    "clientes.ativos",
    "os.quantidade",
    "os.abertas",
    "estoque.valor",
    "tax.carga",
    "vendas.crescimento",
    "fin.necessidade_caixa",
  ];

  const kpis = priorityIds
    .map((id) => metrics.find((m) => m.definitionId === id))
    .filter(Boolean);

  const comparisons = buildComparisons(args.snap, metrics);
  const alerts = buildAnalyticsAlerts({
    snap: args.snap,
    metrics,
    period,
  });
  const provider = resolveExecutiveProvider();
  const insights = provider.explain({
    metrics,
    comparisons,
    alerts,
    context,
  });

  const targets = [
    buildTargetForMetric(args.snap, "vendas.faturamento"),
    buildTargetForMetric(args.snap, "fin.receita_bruta"),
  ];

  const trends = [
    "fin.receita_liquida",
    "vendas.faturamento",
    "fin.ebitda",
  ].map((id) => buildTrendForMetric(args.snap, id));

  return {
    context,
    metrics,
    kpis,
    comparisons,
    alerts,
    insights,
    targets,
    trends,
    layout: mergeAnalyticsLayout(args.layout),
    exports: buildAnalyticsExportStatuses(),
    flags: getAnalyticsFeatureFlags(),
    provider: {
      id: provider.id,
      kind: provider.kind,
      label: provider.label,
    },
    empty:
      metrics.every((m) => m.availability !== "available") &&
      !args.snap.finance &&
      !args.snap.sales &&
      !args.snap.cash,
    sourceHealth: args.snap.sourceHealth ?? {},
    updatedAt: args.snap.asOf,
  };
}

export function analyticsDrillDown(
  snap: AnalyticsDomainSnapshot,
  definitionId: string,
) {
  return buildMetricDrillDownFromSnapshot(snap, definitionId);
}

export { emptyFilter, resolvePeriodPreset };
