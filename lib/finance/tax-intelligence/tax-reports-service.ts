/**
 * Sprint 26.7 — Relatórios Enterprise + preparação de exportação.
 */

import { todayUtc } from "./money-utils.ts";
import type {
  ExecutiveTaxDashboard,
  TaxAiRecommendation,
  TaxAlert,
  TaxCashflowProjection,
  TaxEnterpriseReport,
  TaxSimulationComparison,
} from "./types.ts";

function money(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildTaxEnterpriseReport(args: {
  tenantId: string;
  dashboard: ExecutiveTaxDashboard;
  alerts: TaxAlert[];
  simulations?: TaxSimulationComparison[];
  cashflow?: TaxCashflowProjection | null;
  ai?: TaxAiRecommendation[];
}): TaxEnterpriseReport {
  const sims = args.simulations ?? [];
  const ai = args.ai ?? [];

  return {
    tenantId: args.tenantId,
    generatedAt: new Date().toISOString(),
    title: "Relatório Enterprise — Inteligência Tributária",
    sections: [
      {
        id: "executive",
        title: "Visão executiva",
        summary: `Carga consolidada ${money(args.dashboard.consolidatedLoad)} em ${args.dashboard.asOf}.`,
        metrics: [
          { label: "Carga consolidada", value: money(args.dashboard.consolidatedLoad) },
          { label: "Projetado", value: money(args.dashboard.projectedLoad) },
          {
            label: "Delta realizado vs projetado",
            value: money(args.dashboard.realizedVsProjectedDelta),
          },
        ],
      },
      {
        id: "accounting",
        title: "Visão contábil",
        summary: "Apurações por componente e regime (parametrizadas).",
        metrics: args.dashboard.byCompany.slice(0, 5).map((c) => ({
          label: c.label,
          value: money(c.amount),
        })),
      },
      {
        id: "financial",
        title: "Visão financeira",
        summary: args.cashflow
          ? `Outflow tributário (${args.cashflow.scenario}): ${money(args.cashflow.totalTaxOutflow)}.`
          : "Fluxo de caixa tributário não informado neste relatório.",
        metrics: args.cashflow
          ? [
              {
                label: "Total outflow",
                value: money(args.cashflow.totalTaxOutflow),
              },
              {
                label: "Pico",
                value: `${money(args.cashflow.peakOutflow)} (${args.cashflow.peakDate ?? "—"})`,
              },
            ]
          : [{ label: "Status", value: "Pendente" }],
      },
      {
        id: "comparatives",
        title: "Comparativos",
        summary: "Realizado vs projetado e Reforma Tributária.",
        metrics: [
          {
            label: "Impacto Reforma (delta)",
            value: money(args.dashboard.reformImpact.projectedDelta),
          },
          {
            label: "Regimes em escopo",
            value: args.dashboard.reformImpact.regimesInScope.join(", ") || "—",
          },
        ],
      },
      {
        id: "history",
        title: "Evolução histórica",
        summary: "Tendência mensal a partir das apurações.",
        metrics: args.dashboard.monthlyTrend.map((t) => ({
          label: t.period,
          value: `R ${money(t.realized)} / P ${money(t.projected)}`,
        })),
      },
      {
        id: "trends",
        title: "Tendências",
        summary: "Indicadores de eficiência tributária.",
        metrics: args.dashboard.efficiency.map((e) => ({
          label: e.label,
          value: String(e.value),
        })),
      },
      {
        id: "risks",
        title: "Riscos",
        summary: `${args.alerts.filter((a) => a.severity !== "info").length} alerta(s) relevantes.`,
        metrics: args.alerts.slice(0, 8).map((a) => ({
          label: a.title,
          value: a.severity,
        })),
      },
      {
        id: "opportunities",
        title: "Oportunidades",
        summary: `${args.dashboard.opportunities.length} oportunidade(s) com revisão humana.`,
        metrics: args.dashboard.opportunities.map((o) => ({
          label: o.title,
          value: money(o.estimatedImpact),
        })),
      },
      {
        id: "simulations",
        title: "Simulações",
        summary:
          sims.length > 0
            ? `${sims.length} cenário(s) simulados.`
            : "Nenhuma simulação anexada.",
        metrics: sims.map((s) => ({
          label: s.label,
          value: money(s.delta),
        })),
      },
    ],
    exportFormatsPrepared: ["pdf", "excel", "print"],
    methodology: `Gerado em ${todayUtc()}. Seções derivadas do motor parametrizado. Exportação preparada (PDF/Excel/impressão) — renderers específicos podem ser conectados sem alterar o modelo. IA: ${ai.length} recomendação(ões).`,
  };
}

/** Metadados de exportação — sem gerar binário falso. */
export function prepareTaxReportExport(
  report: TaxEnterpriseReport,
  format: "pdf" | "excel" | "print",
): {
  format: typeof format;
  ready: true;
  filename: string;
  contentType: string;
  payloadHint: string;
} {
  const stamp = report.generatedAt.slice(0, 10);
  if (format === "pdf") {
    return {
      format,
      ready: true,
      filename: `tax-report-${stamp}.pdf`,
      contentType: "application/pdf",
      payloadHint: "Use renderer PDF Enterprise sobre TaxEnterpriseReport.sections.",
    };
  }
  if (format === "excel") {
    return {
      format,
      ready: true,
      filename: `tax-report-${stamp}.xlsx`,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      payloadHint: "Use exporter Excel Enterprise (uma aba por seção).",
    };
  }
  return {
    format,
    ready: true,
    filename: `tax-report-${stamp}.print.html`,
    contentType: "text/html",
    payloadHint: "Layout de impressão Enterprise (CSS print).",
  };
}
