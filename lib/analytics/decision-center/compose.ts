/**
 * Sprint 30.6 — Compose Decision Center a partir do bundle Analytics (puro).
 */

import { projectFromTrend } from "../core/trend-engine.ts";
import type {
  AnalyticsAlert,
  AnalyticsInsight,
  MetricComparison,
  MetricResult,
  MetricTarget,
  MetricTrend,
} from "../core/metric-types.ts";
import type {
  BusinessInsightCard,
  ComparativeRow,
  DecisionCenterPack,
  DecisionItem,
  DecisionPriority,
  EnrichedExecutiveAlert,
  ExecutiveIntelligenceBrief,
  ExecutiveReportDoc,
  ExecutiveSignalCard,
  ForecastItem,
  KpiHealthItem,
  KpiHealthLevel,
  TrendDirection,
  TrendPeriodRow,
} from "./types.ts";

type BundleLike = {
  kpis: Array<MetricResult | undefined | null>;
  metrics: MetricResult[];
  comparisons: MetricComparison[];
  alerts: AnalyticsAlert[];
  insights: AnalyticsInsight[];
  trends: MetricTrend[];
  targets: MetricTarget[];
  context: { tenantSlug: string; filters: { period: { label: string } } };
  updatedAt?: string;
  empty?: boolean;
};

function hrefFor(tenantSlug: string, metricId: string | null): string {
  if (!metricId) return `/${tenantSlug}/analytics/executivo`;
  if (metricId.startsWith("fin.") || metricId.startsWith("tax.")) {
    return `/${tenantSlug}/analytics/financeiro`;
  }
  if (metricId.startsWith("vendas.")) return `/${tenantSlug}/analytics/vendas`;
  if (metricId.startsWith("clientes.")) return `/${tenantSlug}/analytics/clientes`;
  if (metricId.startsWith("os.") || metricId.startsWith("ops.")) {
    return `/${tenantSlug}/analytics/operacoes`;
  }
  if (metricId.startsWith("estoque.")) return `/${tenantSlug}/analytics/estoque`;
  return `/${tenantSlug}/analytics/executivo`;
}

function dirFromComparison(c: MetricComparison | undefined): TrendDirection {
  if (!c || c.deltaPercent == null) return "unknown";
  if (c.trend === "up") return "up";
  if (c.trend === "down") return "down";
  return "flat";
}

function nameOf(metrics: MetricResult[], id: string): string {
  return metrics.find((m) => m.definitionId === id)?.name ?? id;
}

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function signalFromComparison(
  c: MetricComparison,
  metrics: MetricResult[],
  tenantSlug: string,
  label: string,
): ExecutiveSignalCard {
  return {
    id: `${label}-${c.definitionId}`,
    label,
    metricId: c.definitionId,
    metricName: nameOf(metrics, c.definitionId),
    valueLabel: fmt(c.current),
    deltaPercent:
      c.deltaPercent == null
        ? null
        : Math.round(c.deltaPercent * 1000) / 10,
    direction: dirFromComparison(c),
    evidence: c.explanation,
    href: hrefFor(tenantSlug, c.definitionId),
  };
}

export function buildExecutiveBrief(
  bundle: BundleLike,
): ExecutiveIntelligenceBrief {
  const tenantSlug = bundle.context.tenantSlug;
  const comps = bundle.comparisons.filter(
    (c) => c.deltaPercent != null && c.current != null && c.previous != null,
  );
  const improved = comps
    .filter((c) => c.tone === "positive")
    .sort((a, b) => Math.abs(b.deltaPercent ?? 0) - Math.abs(a.deltaPercent ?? 0))
    .slice(0, 5)
    .map((c) => signalFromComparison(c, bundle.metrics, tenantSlug, "Melhorou"));
  const worsened = comps
    .filter((c) => c.tone === "negative")
    .sort((a, b) => Math.abs(b.deltaPercent ?? 0) - Math.abs(a.deltaPercent ?? 0))
    .slice(0, 5)
    .map((c) => signalFromComparison(c, bundle.metrics, tenantSlug, "Piorou"));

  const byGrowth = [...comps].sort(
    (a, b) => (b.deltaPercent ?? -Infinity) - (a.deltaPercent ?? -Infinity),
  );
  const byDrop = [...comps].sort(
    (a, b) => (a.deltaPercent ?? Infinity) - (b.deltaPercent ?? Infinity),
  );

  const criticalAlert = bundle.alerts.find((a) => a.severity === "critical");
  const biggestRisk = criticalAlert
    ? {
        id: `risk-${criticalAlert.id}`,
        label: "Maior risco",
        metricId: criticalAlert.relatedMetricIds[0] ?? null,
        metricName: criticalAlert.title,
        valueLabel: fmt(criticalAlert.impact),
        deltaPercent: null,
        direction: "down" as const,
        evidence: criticalAlert.description,
        href: hrefFor(tenantSlug, criticalAlert.relatedMetricIds[0] ?? null),
      }
    : worsened[0]
      ? { ...worsened[0], id: "risk-" + worsened[0].id, label: "Maior risco" }
      : null;

  const oppInsight = bundle.insights[0];
  const biggestOpportunity = improved[0]
    ? { ...improved[0], id: "opp-" + improved[0].id, label: "Maior oportunidade" }
    : oppInsight
      ? {
          id: `opp-${oppInsight.id}`,
          label: "Maior oportunidade",
          metricId: oppInsight.dataUsed[0] ?? null,
          metricName: oppInsight.title,
          valueLabel: "—",
          deltaPercent: null,
          direction: "up" as const,
          evidence: oppInsight.summary,
          href: hrefFor(tenantSlug, oppInsight.dataUsed[0] ?? null),
        }
      : null;

  const healthiest = improved[0]
    ? { ...improved[0], id: "health-" + improved[0].id, label: "Mais saudável" }
    : null;
  const mostCritical = worsened[0]
    ? { ...worsened[0], id: "crit-" + worsened[0].id, label: "Mais crítico" }
    : biggestRisk;

  const nextFromAlert = bundle.alerts[0];
  const nextAction = nextFromAlert
    ? {
        title: nextFromAlert.recommendation,
        reason: nextFromAlert.description,
        href: hrefFor(tenantSlug, nextFromAlert.relatedMetricIds[0] ?? null),
        priority: (nextFromAlert.severity === "critical"
          ? "critica"
          : nextFromAlert.severity === "attention"
            ? "alta"
            : "media") as DecisionPriority,
      }
    : worsened[0]
      ? {
          title: `Investigar ${worsened[0].metricName}`,
          reason: worsened[0].evidence,
          href: worsened[0].href ?? `/${tenantSlug}/analytics/executivo`,
          priority: "alta" as DecisionPriority,
        }
      : null;

  return {
    improved,
    worsened,
    biggestGrowth: byGrowth[0]
      ? signalFromComparison(byGrowth[0], bundle.metrics, tenantSlug, "Maior crescimento")
      : null,
    biggestDrop: byDrop[0]
      ? signalFromComparison(byDrop[0], bundle.metrics, tenantSlug, "Maior queda")
      : null,
    biggestRisk,
    biggestOpportunity,
    mostCritical,
    healthiest,
    nextAction,
    empty: comps.length === 0 && bundle.alerts.length === 0,
  };
}

export function buildTrendRows(bundle: BundleLike): TrendPeriodRow[] {
  const periodLabel = bundle.context.filters.period.label;
  return bundle.comparisons
    .filter((c) => c.current != null || c.previous != null)
    .slice(0, 24)
    .map((c) => ({
      periodId: periodLabel,
      periodLabel,
      metricId: c.definitionId,
      metricName: nameOf(bundle.metrics, c.definitionId),
      value: c.current,
      previous: c.previous,
      delta: c.delta,
      deltaPercent:
        c.deltaPercent == null
          ? null
          : Math.round(c.deltaPercent * 1000) / 10,
      direction: dirFromComparison(c),
      evidence: c.explanation,
    }));
}

export function buildBusinessInsights(bundle: BundleLike): BusinessInsightCard[] {
  const cards: BusinessInsightCard[] = [];
  const byId = new Map(bundle.comparisons.map((c) => [c.definitionId, c]));

  const rules: Array<{
    id: string;
    metricId: string;
    titleWhenNeg: string;
    titleWhenPos: string;
    toneNeg: BusinessInsightCard["tone"];
    tonePos: BusinessInsightCard["tone"];
  }> = [
    {
      id: "receita",
      metricId: "fin.receita_liquida",
      titleWhenNeg: "Receita caiu",
      titleWhenPos: "Receita aumentou",
      toneNeg: "negative",
      tonePos: "positive",
    },
    {
      id: "margem",
      metricId: "fin.margem_ebitda",
      titleWhenNeg: "Margem piorou",
      titleWhenPos: "Margem aumentou",
      toneNeg: "warning",
      tonePos: "positive",
    },
    {
      id: "faturamento",
      metricId: "vendas.faturamento",
      titleWhenNeg: "Faturamento em queda",
      titleWhenPos: "Faturamento em alta",
      toneNeg: "negative",
      tonePos: "positive",
    },
    {
      id: "ticket",
      metricId: "vendas.ticket_medio",
      titleWhenNeg: "Ticket médio caiu",
      titleWhenPos: "Ticket médio melhorou",
      toneNeg: "warning",
      tonePos: "positive",
    },
    {
      id: "clientes",
      metricId: "clientes.ativos",
      titleWhenNeg: "Clientes ativos em queda",
      titleWhenPos: "Base ativa cresceu",
      toneNeg: "warning",
      tonePos: "positive",
    },
    {
      id: "estoque",
      metricId: "estoque.valor",
      titleWhenNeg: "Valor de estoque caiu",
      titleWhenPos: "Valor de estoque subiu",
      toneNeg: "neutral",
      tonePos: "neutral",
    },
  ];

  for (const r of rules) {
    const c = byId.get(r.metricId);
    if (!c || c.deltaPercent == null) continue;
    const neg = c.tone === "negative";
    const pos = c.tone === "positive";
    if (!neg && !pos) continue;
    cards.push({
      id: `bi-${r.id}`,
      title: neg ? r.titleWhenNeg : r.titleWhenPos,
      ruleId: r.id,
      evidence: c.explanation,
      impactLabel:
        c.deltaPercent == null
          ? null
          : `${c.deltaPercent >= 0 ? "+" : ""}${Math.round(c.deltaPercent * 1000) / 10}%`,
      tone: neg ? r.toneNeg : r.tonePos,
      href: hrefFor(bundle.context.tenantSlug, r.metricId),
    });
  }

  for (const a of bundle.alerts.slice(0, 6)) {
    cards.push({
      id: `bi-alert-${a.id}`,
      title: a.title,
      ruleId: a.dedupeKey,
      evidence: a.description,
      impactLabel: a.impact != null ? fmt(a.impact) : null,
      tone: a.severity === "critical" ? "negative" : "warning",
      href: hrefFor(bundle.context.tenantSlug, a.relatedMetricIds[0] ?? null),
    });
  }

  return cards.slice(0, 16);
}

export function buildForecastPanel(bundle: BundleLike): ForecastItem[] {
  const out: ForecastItem[] = [];
  const mapLabel: Record<string, string> = {
    "fin.receita_liquida": "Receita prevista",
    "fin.lucro_liquido": "Lucro previsto",
    "fin.saldo_consolidado": "Fluxo de caixa previsto",
    "vendas.faturamento": "Meta / faturamento previsto",
    "vendas.quantidade": "Conversão / volume previsto",
  };

  for (const t of bundle.trends) {
    const label = mapLabel[t.definitionId];
    if (!label) continue;
    const proj = projectFromTrend({
      definitionId: t.definitionId,
      points: t.points,
      horizonDays: 30,
      scenario: "base",
    });
    out.push({
      id: `fc-${t.definitionId}`,
      label,
      projected: proj.projected,
      formatted:
        proj.projected == null
          ? "Dados insuficientes"
          : fmt(proj.projected),
      methodology: proj.methodology,
      confidence: proj.confidence,
      limitations: proj.limitations,
      scenario: proj.scenario,
    });
  }

  for (const target of bundle.targets) {
    if (!target.available) continue;
    out.push({
      id: `fc-meta-${target.definitionId}`,
      label: `Meta projetada · ${target.definitionId}`,
      projected: target.projected,
      formatted:
        target.projected == null ? "—" : fmt(target.projected),
      methodology: "Projeção a partir de meta × realização (fonte metas).",
      confidence: target.probabilityLabel ?? "baixa",
      limitations: ["Não é certeza — revisão humana recomendada."],
      scenario: "base",
    });
  }

  if (!out.length) {
    out.push({
      id: "fc-empty",
      label: "Previsão",
      projected: null,
      formatted: "Sem base histórica",
      methodology: "Requer ≥3 pontos na série temporal.",
      confidence: "none",
      limitations: ["Nenhuma tendência disponível no período."],
      scenario: "base",
    });
  }

  return out;
}

export function buildDecisionItems(bundle: BundleLike): DecisionItem[] {
  const items: DecisionItem[] = [];
  const tenantSlug = bundle.context.tenantSlug;

  for (const a of bundle.alerts) {
    const priority: DecisionPriority =
      a.severity === "critical"
        ? "critica"
        : a.severity === "attention"
          ? "alta"
          : "media";
    items.push({
      id: `dec-${a.id}`,
      problem: a.title,
      impact:
        a.impact != null
          ? `Impacto estimado ${fmt(a.impact)}`
          : "Impacto qualitativo — ver evidência",
      evidence: a.description,
      recommendation: a.recommendation,
      priority,
      href: hrefFor(tenantSlug, a.relatedMetricIds[0] ?? null),
      category: a.responsibleHint ?? "Executivo",
    });
  }

  for (const c of bundle.comparisons.filter((x) => x.tone === "negative").slice(0, 5)) {
    items.push({
      id: `dec-comp-${c.definitionId}`,
      problem: `${nameOf(bundle.metrics, c.definitionId)} em deterioração`,
      impact:
        c.deltaPercent == null
          ? "Variação não quantificada"
          : `Variação ${Math.round(c.deltaPercent * 1000) / 10}% vs período anterior`,
      evidence: c.explanation,
      recommendation: `Abrir drill-down de ${c.definitionId} e revisar plano de ação.`,
      priority: Math.abs(c.deltaPercent ?? 0) > 0.2 ? "alta" : "media",
      href: hrefFor(tenantSlug, c.definitionId),
      category: "Indicadores",
    });
  }

  const order: Record<DecisionPriority, number> = {
    critica: 0,
    alta: 1,
    media: 2,
    baixa: 3,
  };
  return items
    .sort((a, b) => order[a.priority] - order[b.priority])
    .slice(0, 12);
}

export function buildKpiHealth(bundle: BundleLike): KpiHealthItem[] {
  const out: KpiHealthItem[] = [];
  for (const k of bundle.kpis) {
    if (!k || k.availability !== "available") continue;
    const c = bundle.comparisons.find((x) => x.definitionId === k.definitionId);
    const alert = bundle.alerts.find((a) =>
      a.relatedMetricIds.includes(k.definitionId),
    );
    let level: KpiHealthLevel = "bom";
    let reason = "Indicador disponível sem alerta crítico.";
    if (alert?.severity === "critical") {
      level = "critico";
      reason = alert.title;
    } else if (alert?.severity === "attention" || c?.tone === "negative") {
      level = "atencao";
      reason = alert?.title ?? c?.explanation ?? "Variação negativa vs período anterior.";
    } else if (c?.tone === "positive" && Math.abs(c.deltaPercent ?? 0) >= 0.05) {
      level = "excelente";
      reason = c.explanation;
    } else if (c?.tone === "positive") {
      level = "bom";
      reason = c.explanation;
    }

    out.push({
      metricId: k.definitionId,
      name: k.name,
      level,
      reason,
      trend: dirFromComparison(c),
      deltaPercent:
        c?.deltaPercent == null
          ? null
          : Math.round(c.deltaPercent * 1000) / 10,
      formatted: k.formatted,
      historyHint:
        c?.previous != null
          ? `Anterior: ${fmt(c.previous)} · Atual: ${fmt(c.current)}`
          : "Sem histórico comparável no período",
    });
  }
  return out;
}

export function buildComparatives(bundle: BundleLike): ComparativeRow[] {
  const pick = (id: string) =>
    bundle.metrics.find((m) => m.definitionId === id && m.availability === "available")
      ?.value ?? null;

  const periodLabel = bundle.context.filters.period.label;
  return [
    {
      dimension: "periodo",
      label: periodLabel,
      receita: pick("fin.receita_liquida") ?? pick("fin.receita_bruta"),
      lucro: pick("fin.lucro_liquido") ?? pick("fin.ebitda"),
      conversao: pick("vendas.crescimento"),
      ticket: pick("vendas.ticket_medio"),
      pipeline: pick("vendas.faturamento"),
      caixa: pick("fin.saldo_consolidado") ?? pick("fin.capital_giro"),
      evidence:
        "Valores do snapshot Analytics no período selecionado — sem inventar dimensões ausentes.",
    },
  ];
}

export function enrichAlerts(bundle: BundleLike): EnrichedExecutiveAlert[] {
  return bundle.alerts.map((a) => {
    const gravity =
      a.severity === "critical"
        ? "critica"
        : a.severity === "attention"
          ? "alta"
          : "media";
    const urgency =
      a.severity === "critical"
        ? "imediata"
        : a.severity === "attention"
          ? "alta"
          : "media";
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      severity: a.severity,
      financialImpact: a.impact,
      gravity,
      urgency,
      category: a.responsibleHint ?? "Geral",
      responsible: a.responsibleHint,
      deadline:
        a.severity === "critical"
          ? "Hoje"
          : a.severity === "attention"
            ? "Esta semana"
            : "Próximos 15 dias",
      recommendation: a.recommendation,
      href: hrefFor(bundle.context.tenantSlug, a.relatedMetricIds[0] ?? null),
    };
  });
}

export function buildExecutiveReport(
  bundle: BundleLike,
  brief: ExecutiveIntelligenceBrief,
  decisions: DecisionItem[],
): ExecutiveReportDoc {
  const periodLabel = bundle.context.filters.period.label;
  const generatedAt = bundle.updatedAt ?? new Date().toISOString();
  const positives = brief.improved.map(
    (i) => `${i.metricName}: ${i.valueLabel} (${i.deltaPercent ?? "—"}%)`,
  );
  const criticals = [
    ...brief.worsened.map(
      (i) => `${i.metricName}: ${i.valueLabel} (${i.deltaPercent ?? "—"}%)`,
    ),
    ...bundle.alerts
      .filter((a) => a.severity === "critical")
      .map((a) => a.title),
  ];
  const actions = decisions.slice(0, 5).map((d) => d.recommendation);
  const risks = brief.biggestRisk
    ? [brief.biggestRisk.evidence]
    : criticals.slice(0, 3);
  const opportunities = brief.biggestOpportunity
    ? [brief.biggestOpportunity.evidence]
    : brief.improved.slice(0, 3).map((i) => i.evidence);

  const summary =
    brief.empty
      ? "Sem evidências comparáveis no período — nada foi inventado."
      : `Período ${periodLabel}: ${positives.length} sinais positivos, ${criticals.length} pontos de atenção, ${decisions.length} decisões priorizadas.`;

  const markdown = [
    `# Relatório Executivo — ${periodLabel}`,
    ``,
    `Gerado em: ${generatedAt}`,
    ``,
    `## Resumo`,
    summary,
    ``,
    `## Pontos positivos`,
    ...(positives.length ? positives.map((p) => `- ${p}`) : ["- Nenhum no período"]),
    ``,
    `## Pontos críticos`,
    ...(criticals.length ? criticals.map((p) => `- ${p}`) : ["- Nenhum no período"]),
    ``,
    `## Ações recomendadas`,
    ...(actions.length ? actions.map((p) => `- ${p}`) : ["- Manter monitoramento"]),
    ``,
    `## Riscos`,
    ...(risks.length ? risks.map((p) => `- ${p}`) : ["- Sem risco evidenciado"]),
    ``,
    `## Oportunidades`,
    ...(opportunities.length
      ? opportunities.map((p) => `- ${p}`)
      : ["- Sem oportunidade evidenciada"]),
    ``,
    `_Fonte: Analytics Enterprise · regras determinísticas · sem IA generativa._`,
  ].join("\n");

  return {
    title: `Relatório Executivo · ${periodLabel}`,
    generatedAt,
    periodLabel,
    summary,
    positives,
    criticals,
    actions,
    risks,
    opportunities,
    markdown,
  };
}

export function composeDecisionCenterPack(bundle: BundleLike): DecisionCenterPack {
  const brief = buildExecutiveBrief(bundle);
  const decisions = buildDecisionItems(bundle);
  return {
    brief,
    trends: buildTrendRows(bundle),
    insights: buildBusinessInsights(bundle),
    forecast: buildForecastPanel(bundle),
    decisions,
    kpiHealth: buildKpiHealth(bundle),
    comparatives: buildComparatives(bundle),
    alerts: enrichAlerts(bundle),
    report: buildExecutiveReport(bundle, brief, decisions),
    generatedAt: bundle.updatedAt ?? new Date().toISOString(),
  };
}
