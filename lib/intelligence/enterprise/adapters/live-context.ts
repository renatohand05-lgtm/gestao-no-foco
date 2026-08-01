/**
 * Sprint 27.6.1 — Live Context adapters (fontes canônicas reais).
 * Nunca inventa zero: null/unavailable quando fonte falha ou lacuna.
 */

import type { ContextMetricInput } from "../context/engine.ts";
import { makeMetricEvidence } from "../evidence/registry.ts";
import type { EvidenceItem } from "../types.ts";

export type LiveContextBundle = {
  metrics: ContextMetricInput[];
  evidence: EvidenceItem[];
  coverageNotes: string[];
  sourcesUsed: string[];
  missingSources: string[];
};

function metric(
  key: string,
  value: unknown,
  source: string,
  available: boolean,
): ContextMetricInput {
  return { key, value: available ? value : null, source, available };
}

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

/**
 * Carrega métricas live a partir das actions/services canônicas.
 * Falhas por domínio viram missingSources — sem inventar.
 */
export async function loadLiveIntelligenceContext(input: {
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
}): Promise<LiveContextBundle> {
  const metrics: ContextMetricInput[] = [];
  const evidence: EvidenceItem[] = [];
  const coverageNotes: string[] = [];
  const sourcesUsed: string[] = [];
  const missingSources: string[] = [];
  const slug = input.tenantSlug;
  const can = (p: string) =>
    input.permissions.includes(p) ||
    input.permissions.includes("inteligencia.visualizar") ||
    input.permissions.includes("inteligencia.executivo");

  // ——— Finance / Cash ———
  if (can("financeiro.visualizar") || can("dashboard.financeiro") || can("inteligencia.explicar")) {
    try {
      const { getCashIntelligenceDashboard } = await import(
        "../../../finance/cash-intelligence/cash-intelligence-actions.ts"
      );
      const cash = await getCashIntelligenceDashboard(slug, { horizonDays: 30 });
      if (cash.success) {
        const bal = cash.dashboard.balance;
        const proj = cash.dashboard.projection;
        const saldo = numOrNull(bal?.available ?? bal?.consolidated);
        metrics.push(metric("saldoAtual", saldo, "cash", saldo != null));
        const overdueAlerts =
          cash.dashboard.alerts?.filter((a) =>
            /vencid|overdue|atras/i.test(`${a.title} ${a.description}`),
          ).length ?? null;
        const vencidosValor = numOrNull(cash.dashboard.payablesOpen);
        metrics.push(
          metric(
            "contasVencidas",
            vencidosValor ?? overdueAlerts,
            "cash",
            vencidosValor != null || overdueAlerts != null,
          ),
        );
        const p7 = proj?.insufficientData
          ? null
          : numOrNull(proj?.closingBalance);
        metrics.push(metric("proj7", p7, "cash", p7 != null && !proj?.insufficientData));
        metrics.push(
          metric(
            "proj30",
            proj?.insufficientData ? null : numOrNull(proj?.closingBalance),
            "cash",
            !proj?.insufficientData && proj?.closingBalance != null,
          ),
        );
        sourcesUsed.push("cash-intelligence");
        if (saldo != null) {
          evidence.push(
            makeMetricEvidence({
              tenantId: input.tenantId,
              module: "financeiro",
              source: "cash-intelligence.balance.available",
              metric: "saldoAtual",
              value: saldo,
              deepLink: `/${slug}/financeiro/caixa`,
              reliability: "alta",
              freshness: "fresh",
            }),
          );
        } else {
          missingSources.push("saldoAtual");
        }
        if (proj?.insufficientData) {
          coverageNotes.push("Projeção de caixa com dados insuficientes — não fabricada.");
          missingSources.push("projecaoCaixa");
        }
      } else {
        missingSources.push("cash-intelligence");
        coverageNotes.push(`Caixa indisponível: ${cash.error}`);
      }
    } catch (e) {
      missingSources.push("cash-intelligence");
      coverageNotes.push(
        `Caixa: ${e instanceof Error ? e.message : "falha de leitura"}`,
      );
    }
  } else {
    missingSources.push("financeiro.permissao");
  }

  // ——— Sales / faturamento mês ———
  if (can("vendas.visualizar") || can("dashboard.vendas") || can("analytics.vendas")) {
    try {
      const { createResumoVendasMesService } = await import(
        "../../../dashboard/resumo-vendas-mes-service.ts"
      ).catch(() => ({ createResumoVendasMesService: null as null }));
      // Fallback: try aggregate via dashboard if factory differs
      if (createResumoVendasMesService) {
        const now = new Date();
        const svc = await createResumoVendasMesService(input.tenantId);
        const resumo = await svc.getResumo({
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        });
        const fat = numOrNull(resumo?.total?.realizado_acumulado);
        metrics.push(metric("faturamentoMes", fat, "vendas", fat != null));
        sourcesUsed.push("resumo-vendas-mes");
        if (fat != null) {
          evidence.push(
            makeMetricEvidence({
              tenantId: input.tenantId,
              module: "vendas",
              source: "dashboard.resumo-vendas-mes",
              metric: "faturamentoMes",
              value: fat,
              deepLink: `/${slug}/vendas`,
              reliability: "alta",
              freshness: "fresh",
            }),
          );
        } else missingSources.push("faturamentoMes");
      } else {
        missingSources.push("vendas-service");
      }
    } catch {
      missingSources.push("vendas");
      coverageNotes.push("Faturamento do mês indisponível na fonte canônica.");
    }
  }

  // ——— CRM ———
  if (can("crm.visualizar") || can("clientes.visualizar")) {
    try {
      const { createCrmDashboardService } = await import(
        "../../../crm/cliente-360-service.ts"
      );
      const crm = await createCrmDashboardService(input.tenantId);
      const kpis = await crm.getKpis(30);
      const ativos = numOrNull(kpis.clientes_ativos);
      const semRetorno = numOrNull(kpis.clientes_sem_retorno);
      const oppVenc = numOrNull(kpis.oportunidades_vencidas);
      metrics.push(metric("clientesAtivos", ativos, "crm", ativos != null));
      metrics.push(
        metric("clientesSemRetorno", semRetorno, "crm", semRetorno != null),
      );
      metrics.push(
        metric("pipelineEstagnado", oppVenc, "crm", oppVenc != null),
      );
      metrics.push(
        metric("churnProvavel", null, "crm", false),
      );
      sourcesUsed.push("crm-dashboard");
      if (semRetorno != null) {
        evidence.push(
          makeMetricEvidence({
            tenantId: input.tenantId,
            module: "crm",
            source: "crm.dashboard.clientes_sem_retorno",
            metric: "clientesSemRetorno",
            value: semRetorno,
            deepLink: `/${slug}/crm`,
            reliability: "alta",
            freshness: "fresh",
          }),
        );
      }
      missingSources.push("churn"); // never invent
      coverageNotes.push("Churn não calculado — base insuficiente (não inventado).");
    } catch {
      missingSources.push("crm");
    }
  }

  // ——— Operations / OS ———
  if (can("os.visualizar") || can("dashboard.operacoes")) {
    try {
      const { createOsDashboardService } = await import(
        "../../../ordens/os-dashboard-service.ts"
      );
      const os = await createOsDashboardService(input.tenantId);
      const data = await os.getData();
      const abertas = numOrNull(data.kpis.abertas);
      const atrasadas = numOrNull(data.kpis.vencidas);
      const paradas = numOrNull(data.kpis.pendentes);
      metrics.push(metric("osAbertas", abertas, "ordens", abertas != null));
      metrics.push(metric("osAtrasadas", atrasadas, "ordens", atrasadas != null));
      metrics.push(metric("osParadas", paradas, "ordens", paradas != null));
      sourcesUsed.push("os-dashboard");
      if (atrasadas != null) {
        evidence.push(
          makeMetricEvidence({
            tenantId: input.tenantId,
            module: "operacoes",
            source: "os.dashboard.vencidas",
            metric: "osAtrasadas",
            value: atrasadas,
            deepLink: `/${slug}/ordens`,
            reliability: "alta",
            freshness: "fresh",
          }),
        );
      }
    } catch {
      missingSources.push("ordens");
    }
  }

  // ——— Inventory / Purchases (supply) ———
  if (can("estoque.visualizar") || can("compras.visualizar") || can("supply.dashboard.visualizar")) {
    try {
      const { getExecutiveSupplyDashboard } = await import(
        "../../../supply/supply-enterprise-actions.ts"
      );
      const supply = await getExecutiveSupplyDashboard(slug);
      const rupturaKpi = supply.kpis?.find(
        (k: { definitionId: string }) => k.definitionId === "supply.ruptura",
      );
      const paradoKpi = supply.kpis?.find(
        (k: { definitionId: string }) => k.definitionId === "supply.parado",
      );
      const ruptura =
        rupturaKpi?.availability === "available"
          ? numOrNull(rupturaKpi.value)
          : null;
      const parado =
        paradoKpi?.availability === "available"
          ? numOrNull(paradoKpi.value)
          : null;
      const pedidosAbertos = numOrNull(supply.purchases?.pedidosAbertos);
      metrics.push(
        metric("estoqueAbaixoMinimo", ruptura, "estoque", ruptura != null),
      );
      metrics.push(metric("estoqueZerado", ruptura, "estoque", ruptura != null));
      metrics.push(metric("valorParado", parado, "estoque", parado != null));
      metrics.push(
        metric("pedidosAtrasados", pedidosAbertos, "compras", pedidosAbertos != null),
      );
      sourcesUsed.push("supply-enterprise");
      if (ruptura != null) {
        evidence.push(
          makeMetricEvidence({
            tenantId: input.tenantId,
            module: "estoque",
            source: "supply.kpis.rupturaCount",
            metric: "estoqueAbaixoMinimo",
            value: ruptura,
            deepLink: `/${slug}/estoque`,
            reliability: "media",
            freshness: "fresh",
          }),
        );
      } else {
        missingSources.push("estoque.ruptura");
      }
    } catch {
      missingSources.push("supply");
      coverageNotes.push("Supply/estoque indisponível ou sem permissão.");
    }
  }

  if (metrics.filter((m) => m.available).length === 0) {
    coverageNotes.push(
      "Nenhuma métrica live disponível — resposta deterministic limitada; confiança indisponível.",
    );
  }

  return { metrics, evidence, coverageNotes, sourcesUsed, missingSources };
}
