/**
 * Fase 23 — Analytics Engine: resolve métricas a partir do snapshot de domínio.
 */

import { compareMetricValues } from "./comparison-engine.ts";
import { emptyDrillDown, buildDrillDown } from "./drill-down-engine.ts";
import type { AnalyticsDateRange, MetricFilter } from "./metric-types.ts";
import { getMetricDefinition, METRIC_CATALOG } from "./metric-registry.ts";
import { buildMetricTrend } from "./trend-engine.ts";
import type { AnalyticsDomainSnapshot } from "./analytics-context.ts";
import type {
  MetricComparison,
  MetricDefinition,
  MetricResult,
  MetricTarget,
} from "./metric-types.ts";

function money(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatValue(
  value: number | null,
  unit: MetricDefinition["unit"],
): string {
  if (value == null) return "Dados indisponíveis";
  if (!Number.isFinite(value)) return "Dados indisponíveis";
  if (unit === "currency") return money(value);
  if (unit === "percent") return `${(value * 100).toFixed(1)}%`;
  if (unit === "ratio") return value.toFixed(3);
  if (unit === "days") return `${value.toFixed(1)} d`;
  if (unit === "count") return String(Math.round(value));
  return String(value);
}

function finiteValue(v: number | null | undefined): number | null {
  if (v == null) return null;
  return Number.isFinite(v) ? v : null;
}

function unavailableResult(
  def: MetricDefinition,
  ctx: {
    tenantId: string;
    period: AnalyticsDateRange;
    filters: MetricFilter;
    asOf: string;
    reason?: string;
  },
): MetricResult {
  return {
    definitionId: def.id,
    name: def.name,
    value: null,
    formatted: "Dados indisponíveis",
    unit: def.unit,
    period: ctx.period,
    filtersApplied: ctx.filters,
    source: def.source,
    origin: def.source,
    updatedAt: ctx.asOf,
    confidence: "none",
    confidenceReason: ctx.reason ?? def.unavailableReason ?? "Fonte ausente",
    availability: "unavailable",
    unavailableReason: ctx.reason ?? def.unavailableReason,
    tenantId: ctx.tenantId,
    dimensions: {},
    drillDownAvailable: false,
    methodology: def.formula,
  };
}

type Extractor = (snap: AnalyticsDomainSnapshot) => number | null | undefined;

const EXTRACTORS: Record<string, Extractor> = {
  "fin.receita_bruta": (s) => s.finance?.receitaBruta,
  "fin.receita_liquida": (s) => s.finance?.receitaLiquida,
  "fin.ebitda": (s) => s.finance?.ebitda,
  "fin.margem_ebitda": (s) => s.finance?.margemEbitda,
  "fin.lucro_operacional": (s) => s.finance?.ebit,
  "fin.lucro_liquido": (s) => s.finance?.lucroLiquido,
  "fin.despesas": (s) => s.finance?.despesas,
  "fin.custos": (s) => s.finance?.cmv,
  "fin.entradas": (s) => s.cash?.entradas,
  "fin.saidas": (s) => s.cash?.saidas,
  "fin.saldo_consolidado": (s) => s.cash?.saldoConsolidado,
  "fin.capital_giro": (s) => s.cash?.capitalGiro,
  "fin.contas_pagar": (s) => s.cash?.contasPagar,
  "fin.contas_receber": (s) => s.cash?.contasReceber,
  "fin.inadimplencia": (s) => s.cash?.inadimplencia,
  "fin.fluxo_realizado": (s) => s.cash?.fluxoRealizadoNet,
  "fin.fluxo_previsto": (s) => s.cash?.fluxoPrevistoNet,
  "fin.fluxo_projetado": (s) => s.cash?.fluxoProjetadoClosing,
  "fin.necessidade_caixa": (s) => s.cash?.necessidadeCaixa,
  "vendas.faturamento": (s) => s.sales?.faturamento,
  "vendas.quantidade": (s) => s.sales?.quantidade,
  "vendas.ticket_medio": (s) => s.sales?.ticketMedio,
  "vendas.conversao": (s) => s.sales?.conversao,
  "vendas.cancelamentos": (s) => s.sales?.cancelamentos,
  "vendas.descontos": (s) => s.sales?.descontos,
  "vendas.margem": (s) => s.sales?.margem,
  "vendas.crescimento": (s) => {
    const cur = s.sales?.faturamento;
    const prev = s.sales?.previousFaturamento;
    if (cur == null || prev == null || prev === 0) return null;
    return (cur - prev) / Math.abs(prev);
  },
  "clientes.ativos": (s) => s.customers?.ativos,
  "clientes.novos": (s) => s.customers?.novos,
  "clientes.recorrentes": (s) => s.customers?.recorrentes,
  "clientes.inativos": (s) => s.customers?.inativos,
  "clientes.frequencia": (s) => s.customers?.frequencia,
  "clientes.ticket_medio": (s) => s.customers?.ticketMedio,
  "clientes.receita": (s) => s.customers?.receitaPorCliente,
  "clientes.concentracao": (s) => s.customers?.concentracaoTop,
  "clientes.risco": (s) => s.customers?.emRisco,
  "os.quantidade": (s) => s.operations?.quantidade,
  "os.abertas": (s) => s.operations?.abertas,
  "os.concluidas": (s) => s.operations?.concluidas,
  "os.tempo_medio": (s) => s.operations?.tempoMedio,
  "os.retrabalho": (s) => s.operations?.retrabalho,
  "os.conversao_orcamento": (s) => s.operations?.conversao,
  "os.faturamento": (s) => s.operations?.faturamento,
  "os.ticket_medio": (s) => s.operations?.ticketMedio,
  "os.produtividade": (s) => s.operations?.produtividade,
  "estoque.valor": (s) => s.inventory?.valor,
  "estoque.giro": (s) => s.inventory?.giro,
  "estoque.cobertura": (s) => s.inventory?.cobertura,
  "estoque.ruptura": (s) => s.inventory?.ruptura,
  "estoque.excesso": (s) => s.inventory?.excesso,
  "estoque.itens_parados": (s) => s.inventory?.itensParados,
  "estoque.compras": (s) => s.inventory?.compras,
  "estoque.consumo": (s) => s.inventory?.consumo,
  "estoque.margem_produto": (s) => s.inventory?.margemProduto,
  "tax.carga": (s) => s.tax?.carga,
  "tax.previsto": (s) => s.tax?.previsto,
  "tax.realizado": (s) => s.tax?.carga,
  "tax.impacto_caixa": (s) => s.tax?.impactoCaixa,
  "tax.eficiencia": (s) => s.tax?.eficiencia,
  "tax.oportunidades": (s) => s.tax?.oportunidades,
  "tax.riscos": (s) => s.tax?.riscos,
  "tax.impacto_ebitda": (s) => s.tax?.impactoEbitdaRatio,
};

const PREV_EXTRACTORS: Record<string, Extractor> = {
  "fin.receita_bruta": (s) => s.finance?.previous?.receitaBruta,
  "fin.receita_liquida": (s) => s.finance?.previous?.receitaLiquida,
  "fin.ebitda": (s) => s.finance?.previous?.ebitda,
  "fin.margem_ebitda": (s) => s.finance?.previous?.margemEbitda,
  "fin.lucro_operacional": (s) => s.finance?.previous?.ebit,
  "fin.lucro_liquido": (s) => s.finance?.previous?.lucroLiquido,
  "fin.despesas": (s) => s.finance?.previous?.despesas,
  "fin.custos": (s) => s.finance?.previous?.cmv,
  "vendas.faturamento": (s) => s.sales?.previousFaturamento,
};

function hasPermission(
  permissions: readonly string[],
  required: string,
): boolean {
  if (permissions.includes(required)) return true;
  if (permissions.includes("analytics.visualizar") && required.startsWith("analytics.")) {
    return true;
  }
  if (permissions.includes("analytics.executivo")) return true;
  // Compat dashboard.*
  const map: Record<string, string[]> = {
    "analytics.financeiro": ["dashboard.financeiro", "financeiro.visualizar", "financeiro.ver_dre"],
    "analytics.vendas": ["dashboard.comercial", "vendas.visualizar"],
    "analytics.operacional": ["dashboard.operacional", "os.visualizar", "crm.visualizar"],
    "analytics.estoque": ["dashboard.estoque", "estoque.visualizar"],
    "analytics.tributario": ["financeiro.tributos.visualizar", "financeiro.ver_dre"],
    "analytics.executivo": ["dashboard.executivo"],
    "analytics.configurar": ["dashboard.executivo"],
    "analytics.exportar": ["dashboard.exportar", "relatorios.exportar"],
  };
  return (map[required] ?? []).some((p) => permissions.includes(p));
}

export function resolveMetric(
  snap: AnalyticsDomainSnapshot,
  definitionId: string,
  args: {
    period: AnalyticsDateRange;
    filters: MetricFilter;
    permissions: readonly string[];
  },
): MetricResult {
  const def = getMetricDefinition(definitionId);
  if (!def) {
    return {
      definitionId,
      name: definitionId,
      value: null,
      formatted: "Dados indisponíveis",
      unit: "count",
      period: args.period,
      filtersApplied: args.filters,
      source: "unknown",
      origin: "unknown",
      updatedAt: snap.asOf,
      confidence: "none",
      confidenceReason: "Métrica não está no catálogo.",
      availability: "unavailable",
      unavailableReason: "Métrica desconhecida.",
      tenantId: snap.tenantId,
      dimensions: {},
      drillDownAvailable: false,
      methodology: "—",
    };
  }

  if (!hasPermission(args.permissions, def.requiredPermission)) {
    return unavailableResult(def, {
      tenantId: snap.tenantId,
      period: args.period,
      filters: args.filters,
      asOf: snap.asOf,
      reason: `Sem permissão ${def.requiredPermission}.`,
    });
  }

  if (def.availability === "unavailable") {
    return unavailableResult(def, {
      tenantId: snap.tenantId,
      period: args.period,
      filters: args.filters,
      asOf: snap.asOf,
    });
  }

  const extractor = EXTRACTORS[def.id];
  if (!extractor) {
    // Rankings / dimensionais — valor agregado nulo, drill separado
    if (
      def.id.startsWith("vendas.por_") ||
      def.id === "os.servicos_mais_vendidos" ||
      def.id === "tax.por_regime" ||
      def.id === "tax.por_filial"
    ) {
      const list =
        def.id === "vendas.por_vendedor"
          ? snap.sales?.bySeller
          : def.id === "vendas.por_cliente"
            ? snap.sales?.byClient
            : def.id === "vendas.por_produto"
              ? snap.sales?.byProduct
              : def.id === "vendas.por_filial"
                ? snap.sales?.byBranch
                : def.id === "vendas.por_canal"
                  ? snap.sales?.byChannel
                  : def.id === "os.servicos_mais_vendidos"
                    ? snap.operations?.servicos
                    : def.id === "tax.por_regime"
                      ? snap.tax?.byRegime
                      : snap.tax?.byBranch;
      if (!list?.length) {
        return unavailableResult(def, {
          tenantId: snap.tenantId,
          period: args.period,
          filters: args.filters,
          asOf: snap.asOf,
          reason:
            def.unavailableReason ??
            "Ranking/dimensional sem dados no snapshot (sem estimativa).",
        });
      }
      const total = list.reduce((s, i) => s + i.value, 0);
      return {
        definitionId: def.id,
        name: def.name,
        value: total,
        formatted: formatValue(total, def.unit),
        unit: def.unit,
        period: args.period,
        filtersApplied: args.filters,
        source: def.source,
        origin: def.source,
        updatedAt: snap.asOf,
        confidence: "medium",
        confidenceReason: "Agregado a partir do ranking fonte.",
        availability: "available",
        tenantId: snap.tenantId,
        dimensions: {},
        drillDownAvailable: true,
        methodology: def.formula,
      };
    }

    return unavailableResult(def, {
      tenantId: snap.tenantId,
      period: args.period,
      filters: args.filters,
      asOf: snap.asOf,
      reason: "Extractor não mapeado — métrica não resolvida.",
    });
  }

  const raw = finiteValue(extractor(snap) ?? null);
  if (raw == null || !Number.isFinite(raw)) {
    return unavailableResult(def, {
      tenantId: snap.tenantId,
      period: args.period,
      filters: args.filters,
      asOf: snap.asOf,
      reason:
        def.availability === "partial"
          ? def.unavailableReason ??
            "Fonte parcial ausente neste snapshot."
          : "Valor ausente na fonte — sem estimativa silenciosa.",
    });
  }

  return {
    definitionId: def.id,
    name: def.name,
    value: raw,
    formatted: formatValue(raw, def.unit),
    unit: def.unit,
    period: args.period,
    filtersApplied: args.filters,
    source: def.source,
    origin: def.source,
    updatedAt: snap.asOf,
    confidence: def.availability === "partial" ? "medium" : "high",
    confidenceReason: "Valor proveniente do módulo fonte (sem recálculo).",
    availability: "available",
    tenantId: snap.tenantId,
    dimensions: {},
    drillDownAvailable: def.supportsDrillDown,
    methodology: def.formula,
  };
}

export function resolveCatalogMetrics(
  snap: AnalyticsDomainSnapshot,
  args: {
    period: AnalyticsDateRange;
    filters: MetricFilter;
    permissions: readonly string[];
    area?: MetricDefinition["area"];
    ids?: string[];
  },
): MetricResult[] {
  const defs = METRIC_CATALOG.filter((d) => {
    if (args.area && d.area !== args.area) return false;
    if (args.ids && !args.ids.includes(d.id)) return false;
    return true;
  });
  return defs.map((d) =>
    resolveMetric(snap, d.id, {
      period: args.period,
      filters: args.filters,
      permissions: args.permissions,
    }),
  );
}

export function buildComparisons(
  snap: AnalyticsDomainSnapshot,
  results: MetricResult[],
): MetricComparison[] {
  return results
    .filter((r) => r.availability === "available")
    .map((r) => {
      const def = getMetricDefinition(r.definitionId)!;
      const prevExt = PREV_EXTRACTORS[r.definitionId];
      const previous = prevExt ? prevExt(snap) ?? null : null;
      return compareMetricValues({
        definitionId: r.definitionId,
        current: r.value,
        previous,
        polarity: def.polarity,
      });
    });
}

export function buildTargetForMetric(
  snap: AnalyticsDomainSnapshot,
  definitionId: string,
): MetricTarget {
  if (definitionId !== "vendas.faturamento" && definitionId !== "fin.receita_bruta") {
    return {
      definitionId,
      target: null,
      realized: null,
      projected: null,
      attainment: null,
      gap: null,
      probabilityLabel: null,
      source: "lib/metas",
      available: false,
      unavailableReason:
        "Meta canônica disponível apenas para faturamento comercial (metas_vendas_*).",
    };
  }
  if (
    snap.metas?.metaFaturamento == null ||
    snap.metas?.realizadoFaturamento == null
  ) {
    return {
      definitionId,
      target: null,
      realized: null,
      projected: null,
      attainment: null,
      gap: null,
      probabilityLabel: null,
      source: "lib/metas",
      available: false,
      unavailableReason: "Metas de vendas não carregadas no snapshot.",
    };
  }
  return {
    definitionId,
    target: snap.metas.metaFaturamento,
    realized: snap.metas.realizadoFaturamento,
    projected: snap.metas.projecaoFaturamento ?? null,
    attainment: snap.metas.attainment ?? null,
    gap:
      snap.metas.metaFaturamento - snap.metas.realizadoFaturamento,
    probabilityLabel: snap.metas.probabilidadeLabel ?? null,
    source: "lib/metas/meta-vendas-service + commercial-panel",
    available: true,
  };
}

export function buildTrendForMetric(
  snap: AnalyticsDomainSnapshot,
  definitionId: string,
) {
  const points = snap.series?.[definitionId] ?? [];
  return buildMetricTrend({
    definitionId,
    points,
    updatedAt: snap.asOf,
  });
}

export function buildMetricDrillDownFromSnapshot(
  snap: AnalyticsDomainSnapshot,
  definitionId: string,
) {
  const def = getMetricDefinition(definitionId);
  if (!def?.supportsDrillDown) {
    return emptyDrillDown(
      definitionId,
      "periodo",
      "Drill-down não suportado ou métrica indisponível.",
    );
  }

  let items: Array<{ id: string; label: string; value: number; origin?: string }> =
    [];
  if (definitionId === "vendas.por_vendedor") {
    items = (snap.sales?.bySeller ?? []).map((i) => ({
      ...i,
      origin: "commercial-intelligence",
    }));
  } else if (definitionId === "vendas.por_cliente" || definitionId === "clientes.receita") {
    items = (snap.sales?.byClient ?? snap.finance?.topClientes ?? []).map(
      (i) => ({ ...i, origin: "crm|fi" }),
    );
  } else if (definitionId === "fin.receita_bruta" || definitionId === "fin.despesas") {
    items = (snap.finance?.topCentros ?? []).map((i) => ({
      ...i,
      origin: "financial-intelligence",
    }));
  } else if (definitionId === "tax.por_regime") {
    items = (snap.tax?.byRegime ?? []).map((i) => ({
      ...i,
      origin: "tax-intelligence",
    }));
  } else if (definitionId === "tax.por_filial") {
    items = (snap.tax?.byBranch ?? []).map((i) => ({
      ...i,
      origin: "tax-intelligence",
    }));
  } else if (definitionId === "os.servicos_mais_vendidos") {
    items = (snap.operations?.servicos ?? []).map((i) => ({
      ...i,
      origin: "os-dashboard",
    }));
  }

  if (!items.length) {
    return emptyDrillDown(
      definitionId,
      "periodo",
      "Sem linhas rastreáveis no snapshot — drill-down não fabricado.",
    );
  }

  return buildDrillDown({
    definitionId,
    level: "documento",
    items: items.map((i) => ({
      id: i.id,
      label: i.label,
      value: i.value,
      origin: i.origin ?? null,
    })),
    methodology: `Drill-down a partir de ${def.source} — sem linhas sintéticas.`,
  });
}

export { hasPermission as analyticsPermissionSatisfied };
