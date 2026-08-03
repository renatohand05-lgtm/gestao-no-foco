/**
 * Fase 23 / Sprint 30.6 — AnalyticsDomainSnapshot.
 * Fontes independentes em Promise.all (perf) — sem alterar módulos financeiros.
 */

import { cache } from "react";

import type { AnalyticsDomainSnapshot } from "./core/analytics-context.ts";
import type { AnalyticsDateRange } from "./core/metric-types.ts";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function rankList(raw: unknown): Array<{ id: string; label: string; value: number }> {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    const r = asRecord(item);
    const id = String(r.id ?? r.responsavelId ?? r.canal ?? r.key ?? r.nome ?? idx);
    const label = String(r.label ?? r.nome ?? r.canal ?? id);
    const value = num(r.value ?? r.valor ?? r.faturamento ?? r.amount) ?? 0;
    return { id, label, value };
  });
}

type HealthMark = {
  key: string;
  status: "ok" | "empty" | "error";
  message: string;
};

type SliceResult = {
  patch: Partial<AnalyticsDomainSnapshot>;
  marks: HealthMark[];
};

async function loadFinanceSlice(
  tenantId: string,
  tenantSlug: string,
  period: AnalyticsDateRange,
): Promise<SliceResult> {
  try {
    const { createFinancialIntelligenceService } = await import(
      "@/lib/financial-intelligence/service"
    );
    const { defaultDrePeriodo } = await import("@/lib/financeiro/dre-service");
    const fi = await createFinancialIntelligenceService(tenantId, tenantSlug);
    const fiSnap = asRecord(
      await fi.getSnapshot({
        ...defaultDrePeriodo(),
        dataDe: period.from,
        dataAte: period.to,
      }),
    );
    const cards = Array.isArray(fiSnap.metrics) ? fiSnap.metrics : [];
    const pick = (key: string) => {
      const c = cards.find((x) => asRecord(x).key === key);
      const row = asRecord(c);
      if (row.available === false) return null;
      return num(row.value);
    };
    const prev = (key: string) => {
      const c = cards.find((x) => asRecord(x).key === key);
      return num(asRecord(asRecord(c).comparison).previous);
    };
    const normPct = (v: number | null) =>
      v != null && v > 1 ? v / 100 : v;

    const finance = {
      receitaBruta: pick("receita_bruta"),
      receitaLiquida: pick("receita_liquida"),
      ebitda: pick("ebitda"),
      margemEbitda: normPct(pick("margem_ebitda")),
      ebit: pick("ebit"),
      lucroLiquido: pick("resultado_liquido"),
      despesas: pick("despesas_operacionais"),
      cmv: pick("cmv"),
      previous: {
        receitaBruta: prev("receita_bruta") ?? undefined,
        receitaLiquida: prev("receita_liquida") ?? undefined,
        ebitda: prev("ebitda") ?? undefined,
        margemEbitda: normPct(prev("margem_ebitda")) ?? undefined,
        ebit: prev("ebit") ?? undefined,
        lucroLiquido: prev("resultado_liquido") ?? undefined,
        despesas: prev("despesas_operacionais") ?? undefined,
        cmv: prev("cmv") ?? undefined,
      },
      topCentros: rankList(fiSnap.topCentros),
      topClientes: rankList(fiSnap.topClientes),
    };
    return {
      patch: { finance },
      marks: [
        {
          key: "finance",
          status: finance.receitaLiquida != null ? "ok" : "empty",
          message:
            finance.receitaLiquida != null
              ? "Financial Intelligence / DRE"
              : "FI sem receita líquida no período",
        },
      ],
    };
  } catch (error) {
    return {
      patch: {},
      marks: [
        {
          key: "finance",
          status: "error",
          message: error instanceof Error ? error.message : "Falha FI isolada",
        },
      ],
    };
  }
}

async function loadCashSlice(tenantSlug: string): Promise<SliceResult> {
  try {
    const { getCashIntelligenceDashboard } = await import(
      "@/lib/finance/cash-intelligence/cash-intelligence-actions"
    );
    const res = await getCashIntelligenceDashboard(tenantSlug, {
      horizonDays: 30,
    });
    if (!res.success) {
      return {
        patch: {},
        marks: [
          {
            key: "cash",
            status: "empty",
            message: res.error ?? "Cash Intelligence sem dados",
          },
        ],
      };
    }
    const d = asRecord(res.dashboard);
    const balance = asRecord(d.balance);
    const wc = asRecord(d.workingCapital);
    const layers = asRecord(d.layers);
    const totals = asRecord(layers.totals);
    const projection = asRecord(d.projection);
    return {
      patch: {
        cash: {
          entradas: num(d.periodInflows),
          saidas: num(d.periodOutflows),
          saldoConsolidado: num(balance.consolidated),
          capitalGiro: num(wc.recommended) ?? num(wc.current),
          necessidadeCaixa: num(wc.gap),
          fluxoRealizadoNet:
            (num(d.periodInflows) ?? 0) - (num(d.periodOutflows) ?? 0),
          fluxoPrevistoNet:
            (num(totals.forecastIn) ?? 0) - (num(totals.forecastOut) ?? 0),
          fluxoProjetadoClosing: num(projection.closingBalance),
          contasPagar: num(d.payablesOpen),
          contasReceber: num(d.receivablesOpen),
          inadimplencia: null,
          riskAlertCount: Array.isArray(d.alerts) ? d.alerts.length : 0,
        },
      },
      marks: [
        { key: "cash", status: "ok", message: "Cash Intelligence" },
        {
          key: "fin.inadimplencia",
          status: "empty",
          message:
            "Inadimplência não exposta no dashboard de caixa — Dados indisponíveis",
        },
      ],
    };
  } catch (error) {
    return {
      patch: {},
      marks: [
        {
          key: "cash",
          status: "error",
          message: error instanceof Error ? error.message : "Falha Cash isolada",
        },
      ],
    };
  }
}

async function loadSalesSlice(
  tenantId: string,
  period: AnalyticsDateRange,
): Promise<SliceResult> {
  try {
    const { createCommercialIntelligenceService } = await import(
      "@/lib/vendas/commercial-intelligence-service"
    );
    const ci = await createCommercialIntelligenceService(tenantId);
    const data = asRecord(
      await ci.load({
        de: period.from,
        ate: period.to,
      }),
    );
    const k = asRecord(data.kpis);
    const rankings = asRecord(data.rankings);
    const byClient = rankList(rankings.clientes);
    const sales = {
      faturamento: num(k.faturamento) ?? num(k.faturamentoLiquido),
      quantidade: num(k.quantidadeFaturadas) ?? num(k.qtdFaturadas),
      ticketMedio: num(k.ticketMedio),
      conversao: num(k.taxaConversao),
      cancelamentos: num(k.canceladas),
      descontos: num(k.desconto) ?? num(k.valorDescontos),
      previousFaturamento: num(asRecord(data.comparativo).faturamentoAnterior),
      bySeller: rankList(rankings.vendedores ?? data.porVendedor),
      byClient,
      byProduct: rankList(rankings.produtos),
      byChannel: rankList(data.porCanal ?? rankings.canais),
      byBranch: rankList(rankings.filiais ?? data.porFilial),
    };
    return {
      patch: { sales },
      marks: [
        {
          key: "sales",
          status: sales.faturamento != null ? "ok" : "empty",
          message: "Commercial Intelligence",
        },
      ],
    };
  } catch (error) {
    return {
      patch: {},
      marks: [
        {
          key: "sales",
          status: "error",
          message: error instanceof Error ? error.message : "Falha Vendas isolada",
        },
      ],
    };
  }
}

async function loadMetasSlice(
  tenantId: string,
  period: AnalyticsDateRange,
): Promise<SliceResult> {
  try {
    const { createCommercialPanelService } = await import(
      "@/lib/metas/commercial-panel-service"
    );
    const service = await createCommercialPanelService(tenantId);
    const panel = await service.getPanel({
      dataDe: period.from,
      dataAte: period.to,
    });
    const proj = panel.projecao;
    if (!proj) {
      return {
        patch: {},
        marks: [{ key: "metas", status: "empty", message: "Sem projeção de meta" }],
      };
    }
    const pct = proj.percentual_atingido;
    return {
      patch: {
        metas: {
          metaFaturamento: proj.valor_meta,
          realizadoFaturamento: proj.faturamento_realizado,
          projecaoFaturamento:
            proj.projecao_dias_uteis ?? proj.projecao_fechamento ?? null,
          attainment: pct == null ? null : pct / 100,
          probabilidadeLabel: null,
        },
      },
      marks: [
        {
          key: "metas",
          status: proj.valor_meta != null ? "ok" : "empty",
          message: "metas_vendas_mensais via commercial-panel",
        },
      ],
    };
  } catch (error) {
    return {
      patch: {},
      marks: [
        {
          key: "metas",
          status: "error",
          message: error instanceof Error ? error.message : "Falha ao carregar metas",
        },
      ],
    };
  }
}

async function loadCustomersSlice(tenantId: string): Promise<SliceResult> {
  try {
    const { createCrmExecutivoService } = await import(
      "@/lib/crm/crm-executivo-service"
    );
    const crm = await createCrmExecutivoService(tenantId);
    const portfolio = asRecord(await crm.loadPortfolio(new Date()));
    const k = asRecord(portfolio.kpis);
    return {
      patch: {
        customers: {
          ativos: num(k.clientesAtivos),
          novos: num(k.novosMes),
          recorrentes: num(k.recorrentes),
          inativos: num(k.inativos180),
          frequencia: num(k.mediaVisitas),
          ticketMedio: num(k.ticketMedioPorCliente),
          receitaPorCliente: num(k.faturamentoPorCliente),
          emRisco: Array.isArray(portfolio.riscos) ? portfolio.riscos.length : null,
          concentracaoTop: null,
        },
      },
      marks: [{ key: "customers", status: "ok", message: "CRM Executivo" }],
    };
  } catch (error) {
    return {
      patch: {},
      marks: [
        {
          key: "customers",
          status: "error",
          message: error instanceof Error ? error.message : "Falha CRM isolada",
        },
      ],
    };
  }
}

async function loadOpsSlice(
  tenantId: string,
  period: AnalyticsDateRange,
): Promise<SliceResult> {
  try {
    const { createOsDashboardService } = await import(
      "@/lib/ordens/os-dashboard-service"
    );
    const os = await createOsDashboardService(tenantId);
    const data = asRecord(
      await os.getData({
        de: period.from,
        ate: period.to,
      }),
    );
    const k = asRecord(data.kpis);
    const series = asRecord(data.series);
    return {
      patch: {
        operations: {
          quantidade:
            (num(k.abertas) ?? 0) +
            (num(k.finalizadas) ?? 0) +
            (num(k.canceladas) ?? 0) +
            (num(k.emExecucao) ?? 0),
          abertas: num(k.abertas),
          concluidas: num(k.finalizadas),
          tempoMedio: num(k.tempoMedioConclusaoDias),
          retrabalho: num(k.indiceRetrabalho),
          conversao: num(k.taxaAprovacao),
          faturamento: num(k.faturamento),
          ticketMedio: num(k.ticketMedio),
          servicos: rankList(series.porTipoServico),
        },
      },
      marks: [{ key: "operations", status: "ok", message: "OS Dashboard" }],
    };
  } catch (error) {
    return {
      patch: {},
      marks: [
        {
          key: "operations",
          status: "error",
          message: error instanceof Error ? error.message : "Falha OS isolada",
        },
      ],
    };
  }
}

async function loadInventorySlice(
  tenantId: string,
  tenantSlug: string,
): Promise<SliceResult> {
  try {
    const { createExecutiveStockService } = await import(
      "@/lib/estoque/executive-stock-service"
    );
    const stock = await createExecutiveStockService(tenantId);
    const data = asRecord(await stock.load(tenantSlug, {}));
    const k = asRecord(data.kpis ?? data);
    const zerados = num(k.produtosZerados) ?? 0;
    const abaixo = num(k.produtosAbaixoMinimo) ?? 0;
    return {
      patch: {
        inventory: {
          valor: num(k.valorTotalEstoque),
          giro: num(k.giroMedio),
          cobertura: num(k.coberturaEstoque),
          ruptura: zerados + abaixo > 0 ? zerados + abaixo : null,
          excesso: num(k.valorFinanceiroParado),
          itensParados: null,
        },
      },
      marks: [
        { key: "inventory", status: "ok", message: "Executive Stock" },
        {
          key: "estoque.curva_abc",
          status: "empty",
          message: "Curva ABC sem fonte canônica — Dados indisponíveis",
        },
      ],
    };
  } catch (error) {
    return {
      patch: {},
      marks: [
        {
          key: "inventory",
          status: "error",
          message: error instanceof Error ? error.message : "Falha Estoque isolada",
        },
      ],
    };
  }
}

async function loadTaxSlice(tenantSlug: string): Promise<SliceResult> {
  try {
    const { getTaxIntelligenceDashboard } = await import(
      "@/lib/finance/tax-intelligence/tax-intelligence-actions"
    );
    const res = await getTaxIntelligenceDashboard(tenantSlug);
    if (!res.success) {
      return {
        patch: {},
        marks: [
          {
            key: "tax",
            status: "empty",
            message: res.error ?? "Tax Intelligence sem dados",
          },
        ],
      };
    }
    const d = asRecord(res.dashboard);
    const efficiency = Array.isArray(d.efficiency) ? d.efficiency : [];
    const eff = efficiency.find((e) => asRecord(e).key === "effective_load");
    const carga = num(d.consolidatedLoad);
    const byBranch = Array.isArray(d.byBranch)
      ? d.byBranch.map((b) => {
          const r = asRecord(b);
          return {
            id: String(r.id),
            label: String(r.label ?? r.id),
            value: num(r.amount) ?? num(r.value) ?? 0,
          };
        })
      : [];
    return {
      patch: {
        tax: {
          carga,
          previsto: num(d.projectedLoad),
          impactoCaixa: num(asRecord(res.cashflow).totalTaxOutflow),
          eficiencia: num(asRecord(eff).value),
          oportunidades: Array.isArray(d.opportunities)
            ? d.opportunities.reduce(
                (s: number, o) => s + (num(asRecord(o).estimatedImpact) ?? 0),
                0,
              )
            : null,
          riscos: Array.isArray(res.alerts)
            ? res.alerts.filter((a) => asRecord(a).severity !== "info").length
            : null,
          impactoEbitdaRatio: null,
          byBranch,
          byRegime: [],
        },
      },
      marks: [{ key: "tax", status: "ok", message: "Tax Intelligence" }],
    };
  } catch (error) {
    return {
      patch: {},
      marks: [
        {
          key: "tax",
          status: "error",
          message: error instanceof Error ? error.message : "Falha Tax isolada",
        },
      ],
    };
  }
}

async function loadAnalyticsDomainSnapshotUncached(args: {
  tenantId: string;
  tenantSlug: string;
  period: AnalyticsDateRange;
}): Promise<AnalyticsDomainSnapshot> {
  if (!args.tenantId?.trim()) {
    throw new Error("tenantId obrigatório no snapshot Analytics.");
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const health: NonNullable<AnalyticsDomainSnapshot["sourceHealth"]> = {};

  const slices = await Promise.all([
    loadFinanceSlice(args.tenantId, args.tenantSlug, args.period),
    loadCashSlice(args.tenantSlug),
    loadSalesSlice(args.tenantId, args.period),
    loadMetasSlice(args.tenantId, args.period),
    loadCustomersSlice(args.tenantId),
    loadOpsSlice(args.tenantId, args.period),
    loadInventorySlice(args.tenantId, args.tenantSlug),
    loadTaxSlice(args.tenantSlug),
  ]);

  const snap: AnalyticsDomainSnapshot = {
    tenantId: args.tenantId,
    tenantSlug: args.tenantSlug,
    asOf,
    sourceHealth: health,
  };

  for (const slice of slices) {
    Object.assign(snap, slice.patch);
    for (const m of slice.marks) {
      health[m.key] = {
        status: m.status,
        message: m.message,
        updatedAt: asOf,
      };
    }
  }

  // Pós-compose: concentração top1 e impacto EBITDA (dependem de sales/finance).
  if (snap.customers && snap.sales?.byClient?.length) {
    const clients = snap.sales.byClient;
    const total = clients.reduce((s, i) => s + i.value, 0);
    if (total > 0 && clients[0]) {
      snap.customers = {
        ...snap.customers,
        concentracaoTop: clients[0].value / total,
      };
    }
  }
  if (snap.tax && snap.finance?.ebitda && snap.finance.ebitda !== 0 && snap.tax.carga != null) {
    snap.tax = {
      ...snap.tax,
      impactoEbitdaRatio: snap.tax.carga / snap.finance.ebitda,
    };
  }

  if (snap.tenantId !== args.tenantId) {
    throw new Error("Violação de tenant isolation no Analytics snapshot.");
  }

  snap.sourceHealth = health;
  return snap;
}

const loadAnalyticsDomainSnapshotCached = cache(
  async (
    tenantId: string,
    tenantSlug: string,
    from: string,
    to: string,
    preset: string,
    label: string,
  ) =>
    loadAnalyticsDomainSnapshotUncached({
      tenantId,
      tenantSlug,
      period: {
        from,
        to,
        preset: preset as AnalyticsDateRange["preset"],
        label,
      },
    }),
);

/** Cache curto entre requests (warm navigation) — dados reais, sem inventar. */
const SNAPSHOT_TTL_MS = 45_000;
const snapshotTtl = new Map<
  string,
  { expires: number; data: AnalyticsDomainSnapshot }
>();

function snapshotCacheKey(
  tenantId: string,
  from: string,
  to: string,
  preset: string,
): string {
  return `${tenantId}|${from}|${to}|${preset}`;
}

function pruneSnapshotTtl(now: number) {
  if (snapshotTtl.size <= 48) return;
  for (const [key, entry] of snapshotTtl) {
    if (entry.expires <= now) snapshotTtl.delete(key);
  }
}

/** Dedup por request (tenant + período) + TTL warm. */
export async function loadAnalyticsDomainSnapshot(args: {
  tenantId: string;
  tenantSlug: string;
  period: AnalyticsDateRange;
}): Promise<AnalyticsDomainSnapshot> {
  const now = Date.now();
  const key = snapshotCacheKey(
    args.tenantId,
    args.period.from,
    args.period.to,
    args.period.preset,
  );
  const hit = snapshotTtl.get(key);
  if (hit && hit.expires > now) {
    return structuredClone(hit.data);
  }

  const data = await loadAnalyticsDomainSnapshotCached(
    args.tenantId,
    args.tenantSlug,
    args.period.from,
    args.period.to,
    args.period.preset,
    args.period.label,
  );
  snapshotTtl.set(key, {
    expires: now + SNAPSHOT_TTL_MS,
    data: structuredClone(data),
  });
  pruneSnapshotTtl(now);
  return data;
}
