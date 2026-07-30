/**
 * Fase 23 — Monta AnalyticsDomainSnapshot a partir dos módulos fonte.
 * Acessos defensivos — fatias ausentes ⇒ métricas "indisponível".
 */

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

export async function loadAnalyticsDomainSnapshot(args: {
  tenantId: string;
  tenantSlug: string;
  period: AnalyticsDateRange;
}): Promise<AnalyticsDomainSnapshot> {
  if (!args.tenantId?.trim()) {
    throw new Error("tenantId obrigatório no snapshot Analytics.");
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const health: NonNullable<AnalyticsDomainSnapshot["sourceHealth"]> = {};
  const mark = (
    key: string,
    status: "ok" | "empty" | "error",
    message: string,
  ) => {
    health[key] = { status, message, updatedAt: asOf };
  };

  const snap: AnalyticsDomainSnapshot = {
    tenantId: args.tenantId,
    tenantSlug: args.tenantSlug,
    asOf,
    sourceHealth: health,
  };

  try {
    const { createFinancialIntelligenceService } = await import(
      "@/lib/financial-intelligence/service"
    );
    const { defaultDrePeriodo } = await import("@/lib/financeiro/dre-service");
    const fi = await createFinancialIntelligenceService(
      args.tenantId,
      args.tenantSlug,
    );
    const fiSnap = asRecord(
      await fi.getSnapshot({
        ...defaultDrePeriodo(),
        dataDe: args.period.from,
        dataAte: args.period.to,
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

    snap.finance = {
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
    mark(
      "finance",
      snap.finance.receitaLiquida != null ? "ok" : "empty",
      snap.finance.receitaLiquida != null
        ? "Financial Intelligence / DRE"
        : "FI sem receita líquida no período",
    );
  } catch (error) {
    mark(
      "finance",
      "error",
      error instanceof Error ? error.message : "Falha FI isolada",
    );
  }

  try {
    const { getCashIntelligenceDashboard } = await import(
      "@/lib/finance/cash-intelligence/cash-intelligence-actions"
    );
    const res = await getCashIntelligenceDashboard(args.tenantSlug, {
      horizonDays: 30,
    });
    if (res.success) {
      const d = asRecord(res.dashboard);
      const balance = asRecord(d.balance);
      const wc = asRecord(d.workingCapital);
      const layers = asRecord(d.layers);
      const totals = asRecord(layers.totals);
      const projection = asRecord(d.projection);
      snap.cash = {
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
        // Inadimplência formal exige títulos overdue — não inventar a partir do consolidado
        inadimplencia: null,
        riskAlertCount: Array.isArray(d.alerts) ? d.alerts.length : 0,
      };
      mark("cash", "ok", "Cash Intelligence");
      mark(
        "fin.inadimplencia",
        "empty",
        "Inadimplência não exposta no dashboard de caixa — Dados indisponíveis",
      );
    } else {
      mark("cash", "empty", res.error ?? "Cash Intelligence sem dados");
    }
  } catch (error) {
    mark(
      "cash",
      "error",
      error instanceof Error ? error.message : "Falha Cash isolada",
    );
  }

  try {
    const { createCommercialIntelligenceService } = await import(
      "@/lib/vendas/commercial-intelligence-service"
    );
    const ci = await createCommercialIntelligenceService(args.tenantId);
    const data = asRecord(
      await ci.load({
        de: args.period.from,
        ate: args.period.to,
      }),
    );
    const k = asRecord(data.kpis);
    const rankings = asRecord(data.rankings);
    const byClient = rankList(rankings.clientes);
    const totalClient = byClient.reduce((s, i) => s + i.value, 0);
    snap.sales = {
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
    mark(
      "sales",
      snap.sales.faturamento != null ? "ok" : "empty",
      "Commercial Intelligence",
    );
    if (totalClient > 0 && byClient[0]) {
      // concentração top1 — só com ranking real
      if (!snap.customers) {
        /* filled below */
      }
    }
  } catch (error) {
    mark(
      "sales",
      "error",
      error instanceof Error ? error.message : "Falha Vendas isolada",
    );
  }

  try {
    const mod = await import("@/lib/metas/commercial-panel-service");
    const factory = (mod as Record<string, unknown>)
      .createCommercialPanelService as
      | ((tenantId: string) => {
          getPanel: (p: Record<string, string>) => Promise<unknown>;
        })
      | undefined;
    if (factory) {
      const panel = asRecord(
        await factory(args.tenantId).getPanel({
          dataDe: args.period.from,
          dataAte: args.period.to,
        }),
      );
      const proj = asRecord(panel.projecao);
      if (Object.keys(proj).length) {
        snap.metas = {
          metaFaturamento: num(proj.meta),
          realizadoFaturamento: num(proj.realizado),
          projecaoFaturamento: num(proj.projetado),
          attainment: num(proj.atingimento),
          probabilidadeLabel:
            typeof proj.probabilidadeLabel === "string"
              ? proj.probabilidadeLabel
              : null,
        };
      }
    }
  } catch {
    /* metas */
  }

  try {
    const { createCrmExecutivoService } = await import(
      "@/lib/crm/crm-executivo-service"
    );
    const crm = await createCrmExecutivoService(args.tenantId);
    const portfolio = asRecord(await crm.loadPortfolio(new Date()));
    const k = asRecord(portfolio.kpis);
    snap.customers = {
      ativos: num(k.clientesAtivos),
      novos: num(k.novosMes),
      recorrentes: num(k.recorrentes),
      inativos: num(k.inativos180),
      frequencia: num(k.mediaVisitas),
      ticketMedio: num(k.ticketMedioPorCliente),
      receitaPorCliente: num(k.faturamentoPorCliente),
      emRisco: Array.isArray(portfolio.riscos) ? portfolio.riscos.length : null,
      concentracaoTop: (() => {
        const clients = snap.sales?.byClient ?? [];
        const total = clients.reduce((s, i) => s + i.value, 0);
        if (!clients.length || total <= 0) return null;
        return clients[0]!.value / total;
      })(),
    };
    mark("customers", "ok", "CRM Executivo");
  } catch (error) {
    mark(
      "customers",
      "error",
      error instanceof Error ? error.message : "Falha CRM isolada",
    );
  }

  try {
    const { createOsDashboardService } = await import(
      "@/lib/ordens/os-dashboard-service"
    );
    const os = await createOsDashboardService(args.tenantId);
    const data = asRecord(
      await os.getData({
        de: args.period.from,
        ate: args.period.to,
      }),
    );
    const k = asRecord(data.kpis);
    const series = asRecord(data.series);
    snap.operations = {
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
    };
    mark("operations", "ok", "OS Dashboard");
  } catch (error) {
    mark(
      "operations",
      "error",
      error instanceof Error ? error.message : "Falha OS isolada",
    );
  }

  try {
    const { createExecutiveStockService } = await import(
      "@/lib/estoque/executive-stock-service"
    );
    const stock = await createExecutiveStockService(args.tenantId);
    const data = asRecord(await stock.load(args.tenantSlug, {}));
    const k = asRecord(data.kpis ?? data);
    const zerados = num(k.produtosZerados) ?? 0;
    const abaixo = num(k.produtosAbaixoMinimo) ?? 0;
    snap.inventory = {
      valor: num(k.valorTotalEstoque),
      giro: num(k.giroMedio),
      cobertura: num(k.coberturaEstoque),
      ruptura: zerados + abaixo > 0 ? zerados + abaixo : null,
      excesso: num(k.valorFinanceiroParado),
      itensParados: null,
    };
    mark("inventory", "ok", "Executive Stock");
    mark(
      "estoque.curva_abc",
      "empty",
      "Curva ABC sem fonte canônica — Dados indisponíveis",
    );
  } catch (error) {
    mark(
      "inventory",
      "error",
      error instanceof Error ? error.message : "Falha Estoque isolada",
    );
  }

  try {
    const { getTaxIntelligenceDashboard } = await import(
      "@/lib/finance/tax-intelligence/tax-intelligence-actions"
    );
    const res = await getTaxIntelligenceDashboard(args.tenantSlug);
    if (res.success) {
      const d = asRecord(res.dashboard);
      const efficiency = Array.isArray(d.efficiency) ? d.efficiency : [];
      const eff = efficiency.find(
        (e) => asRecord(e).key === "effective_load",
      );
      const ebitda = snap.finance?.ebitda;
      const carga = num(d.consolidatedLoad);
      snap.tax = {
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
        impactoEbitdaRatio:
          carga != null && ebitda && ebitda !== 0 ? carga / ebitda : null,
        byBranch: rankList(d.byBranch).map((b) => ({
          ...b,
          value: num(asRecord(b).value) ?? b.value,
        })),
        byRegime: [],
      };
      // byBranch from tax uses `amount`
      snap.tax.byBranch = Array.isArray(d.byBranch)
        ? d.byBranch.map((b) => {
            const r = asRecord(b);
            return {
              id: String(r.id),
              label: String(r.label ?? r.id),
              value: num(r.amount) ?? num(r.value) ?? 0,
            };
          })
        : [];
      mark("tax", "ok", "Tax Intelligence");
    } else {
      mark("tax", "empty", res.error ?? "Tax Intelligence sem dados");
    }
  } catch (error) {
    mark(
      "tax",
      "error",
      error instanceof Error ? error.message : "Falha Tax isolada",
    );
  }

  if (snap.tenantId !== args.tenantId) {
    throw new Error("Violação de tenant isolation no Analytics snapshot.");
  }

  snap.sourceHealth = health;
  return snap;
}
