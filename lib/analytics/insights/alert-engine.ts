/**
 * Fase 23 — Alertas executivos com dedupe.
 */

import type { AnalyticsDomainSnapshot } from "../core/analytics-context.ts";
import type {
  AnalyticsAlert,
  AnalyticsDateRange,
  MetricResult,
} from "../core/metric-types.ts";

function alert(partial: Omit<AnalyticsAlert, "requiresHumanReview" | "autoApplied" | "status">): AnalyticsAlert {
  return {
    ...partial,
    status: "open",
    requiresHumanReview: true,
    autoApplied: false,
  };
}

export function buildAnalyticsAlerts(args: {
  snap: AnalyticsDomainSnapshot;
  metrics: MetricResult[];
  period: AnalyticsDateRange;
}): AnalyticsAlert[] {
  const out: AnalyticsAlert[] = [];
  const { snap, metrics, period } = args;
  const byId = new Map(metrics.map((m) => [m.definitionId, m]));

  const fat = byId.get("vendas.faturamento");
  if (
    snap.metas?.metaFaturamento != null &&
    fat?.value != null &&
    fat.value < snap.metas.metaFaturamento * 0.85
  ) {
    out.push(
      alert({
        id: `alert-meta-fat-${period.from}-${period.to}`,
        dedupeKey: `meta_fat:${period.from}:${period.to}`,
        title: "Faturamento abaixo da meta",
        description: `Realizado ${fat.value} vs meta ${snap.metas.metaFaturamento} no período ${period.label}.`,
        severity: "attention",
        period,
        impact: snap.metas.metaFaturamento - fat.value,
        probableCause: "Realizado comercial inferior ao target de metas_vendas.",
        relatedMetricIds: ["vendas.faturamento"],
        recommendation: "Revisar pipeline e cobertura de meta no painel comercial.",
        responsibleHint: "Comercial",
      }),
    );
  }

  const ebitda = byId.get("fin.ebitda");
  if (ebitda?.value != null && ebitda.value < 0) {
    out.push(
      alert({
        id: `alert-ebitda-neg-${period.from}`,
        dedupeKey: `ebitda_neg:${period.from}:${period.to}`,
        title: "EBITDA negativo",
        description: `EBITDA ${ebitda.value} no período ${period.label}.`,
        severity: "critical",
        period,
        impact: ebitda.value,
        probableCause: "Resultado operacional negativo no DRE fonte.",
        relatedMetricIds: ["fin.ebitda", "fin.despesas"],
        recommendation: "Abrir drill-down de despesas e centros de custo.",
        responsibleHint: "Financeiro",
      }),
    );
  }

  const margem = byId.get("fin.margem_ebitda");
  const prevMargem = snap.finance?.previous?.margemEbitda;
  if (
    margem?.value != null &&
    prevMargem != null &&
    margem.value < prevMargem * 0.9
  ) {
    out.push(
      alert({
        id: `alert-margem-queda-${period.from}`,
        dedupeKey: `margem_down:${period.from}:${period.to}`,
        title: "Margem EBITDA em queda",
        description: `Margem atual ${margem.value} vs anterior ${prevMargem}.`,
        severity: "attention",
        period,
        impact: margem.value - prevMargem,
        probableCause: "Compressão de margem no DRE/FI.",
        relatedMetricIds: ["fin.margem_ebitda", "fin.despesas", "fin.custos"],
        recommendation: "Comparar CMV e OPEX com o período anterior.",
        responsibleHint: "Financeiro",
      }),
    );
  }

  const desp = byId.get("fin.despesas");
  const prevDesp = snap.finance?.previous?.despesas;
  if (desp?.value != null && prevDesp != null && desp.value > prevDesp * 1.15) {
    out.push(
      alert({
        id: `alert-desp-up-${period.from}`,
        dedupeKey: `despesas_up:${period.from}:${period.to}`,
        title: "Aumento de despesas",
        description: `Despesas ${desp.value} (+15% vs anterior).`,
        severity: "attention",
        period,
        impact: desp.value - prevDesp,
        probableCause: "OPEX acima do período comparável.",
        relatedMetricIds: ["fin.despesas"],
        recommendation: "Drill-down por categoria/centro de custo.",
        responsibleHint: "Financeiro",
      }),
    );
  }

  if ((snap.cash?.riskAlertCount ?? 0) > 0 || (snap.cash?.necessidadeCaixa ?? 0) > 0) {
    out.push(
      alert({
        id: `alert-cash-risk-${snap.asOf}`,
        dedupeKey: `cash_risk:${snap.asOf}`,
        title: "Risco de caixa",
        description: "Cash Intelligence sinalizou risco ou necessidade de caixa.",
        severity: "critical",
        period,
        impact: snap.cash?.necessidadeCaixa ?? null,
        probableCause: "Projeção de caixa / alertas de ruptura.",
        relatedMetricIds: ["fin.necessidade_caixa", "fin.fluxo_projetado"],
        recommendation: "Abrir /financeiro/caixa para camadas e recomendações.",
        responsibleHint: "Tesouraria",
      }),
    );
  }

  const inad = byId.get("fin.inadimplencia");
  if (inad?.value != null && inad.value > 0) {
    out.push(
      alert({
        id: `alert-inad-${snap.asOf}`,
        dedupeKey: `inad:${period.from}:${period.to}`,
        title: "Inadimplência (recebíveis vencidos)",
        description: `Há ${inad.value} em títulos a receber vencidos.`,
        severity: inad.value > (snap.cash?.contasReceber ?? 0) * 0.3 ? "critical" : "attention",
        period,
        impact: inad.value,
        probableCause: "Títulos receivable marcados como overdue.",
        relatedMetricIds: ["fin.inadimplencia", "fin.contas_receber"],
        recommendation: "Priorizar cobrança dos maiores vencidos.",
        responsibleHint: "Financeiro / CRM",
      }),
    );
  }

  if ((snap.customers?.emRisco ?? 0) > 0) {
    out.push(
      alert({
        id: `alert-cli-risco-${snap.asOf}`,
        dedupeKey: `cli_risco:${snap.asOf}`,
        title: "Clientes em risco",
        description: `${snap.customers!.emRisco} cliente(s) sinalizados pelo CRM executivo.`,
        severity: "attention",
        period,
        impact: null,
        probableCause: "Regras de risco do CRM executivo.",
        relatedMetricIds: ["clientes.risco", "clientes.inativos"],
        recommendation: "Revisar carteira em /clientes/central.",
        responsibleHint: "CRM",
      }),
    );
  }

  if ((snap.inventory?.ruptura ?? 0) > 0) {
    out.push(
      alert({
        id: `alert-ruptura-${snap.asOf}`,
        dedupeKey: `estoque_ruptura:${snap.asOf}`,
        title: "Ruptura / estoque crítico",
        description: `${snap.inventory!.ruptura} SKU(s) zerados ou abaixo do mínimo.`,
        severity: "attention",
        period,
        impact: null,
        probableCause: "Executive stock: zerados/abaixo mínimo.",
        relatedMetricIds: ["estoque.ruptura", "estoque.cobertura"],
        recommendation: "Abrir dashboard de estoque executivo.",
        responsibleHint: "Estoque",
      }),
    );
  }

  if ((snap.inventory?.excesso ?? 0) > 0) {
    out.push(
      alert({
        id: `alert-parado-${snap.asOf}`,
        dedupeKey: `estoque_parado:${snap.asOf}`,
        title: "Estoque parado",
        description: `Valor parado ${snap.inventory!.excesso}.`,
        severity: "info",
        period,
        impact: snap.inventory!.excesso ?? null,
        probableCause: "valorFinanceiroParado do estoque executivo.",
        relatedMetricIds: ["estoque.excesso", "estoque.giro"],
        recommendation: "Avaliar liquidações e política de compra.",
        responsibleHint: "Estoque",
      }),
    );
  }

  if ((snap.tax?.riscos ?? 0) > 0) {
    out.push(
      alert({
        id: `alert-tax-risk-${snap.asOf}`,
        dedupeKey: `tax_risk:${snap.asOf}`,
        title: "Riscos tributários",
        description: "Tax Intelligence reportou alertas de risco.",
        severity: "attention",
        period,
        impact: snap.tax?.carga ?? null,
        probableCause: "Alertas do módulo tributário parametrizado.",
        relatedMetricIds: ["tax.riscos", "tax.carga"],
        recommendation: "Abrir /financeiro/tributos.",
        responsibleHint: "Fiscal / Financeiro",
      }),
    );
  }

  const conc = snap.customers?.concentracaoTop;
  if (conc != null && conc >= 0.4) {
    out.push(
      alert({
        id: `alert-conc-${snap.asOf}`,
        dedupeKey: `receita_conc:${period.from}:${period.to}`,
        title: "Concentração excessiva de receita",
        description: `Top cliente representa ${(conc * 100).toFixed(0)}% do ranking comercial disponível.`,
        severity: conc >= 0.6 ? "critical" : "attention",
        period,
        impact: null,
        probableCause: "Calculado a partir do ranking de clientes da fonte comercial (não inventado).",
        relatedMetricIds: ["clientes.concentracao", "vendas.por_cliente"],
        recommendation: "Revisar diversificação de carteira (sugestão).",
        responsibleHint: "Comercial / CRM",
      }),
    );
  }

  // Queda de ticket médio: exige quantidade anterior canônica — sem inventar alerta.

  return dedupeAlerts(out);
}

export function dedupeAlerts(alerts: AnalyticsAlert[]): AnalyticsAlert[] {
  const map = new Map<string, AnalyticsAlert>();
  for (const a of alerts) {
    const prev = map.get(a.dedupeKey);
    if (!prev) {
      map.set(a.dedupeKey, a);
      continue;
    }
    const rank = { info: 0, attention: 1, critical: 2 };
    if (rank[a.severity] >= rank[prev.severity]) map.set(a.dedupeKey, a);
  }
  return [...map.values()];
}
