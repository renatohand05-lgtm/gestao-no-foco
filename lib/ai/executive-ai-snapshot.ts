/**
 * Monta o input da IA Executiva a partir de fontes já existentes (Gate 18.5).
 * Soft-fail por módulo. Sem N+1 — Promise.all paralelo.
 */

import type { ExecutiveFinancialCockpitData } from "@/lib/dashboard/executive-financial-cockpit-types";
import type { ExecutiveDashboardContext } from "@/lib/dashboard/executive-dashboard-context-service";
import { toDecisionFeeds } from "@/lib/dashboard/executive-dashboard-context-service";
import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import { createCrmExecutivoService } from "@/lib/crm/crm-executivo-service";
import { createExecutiveStockService } from "@/lib/estoque/executive-stock-service";
import { createCommercialIntelligenceService } from "@/lib/vendas/commercial-intelligence-service";
import type { CommercialIntelligenceData } from "@/lib/vendas/commercial-intelligence-compose";

import { runExecutiveAiEngine } from "./executive-ai-engine";
import type {
  ExecutiveAiComercialFeed,
  ExecutiveAiCrmFeed,
  ExecutiveAiEstoqueFeed,
  ExecutiveAiFinanceiroFeed,
  ExecutiveAiInput,
  ExecutiveAiOperacaoFeed,
  ExecutiveAiResult,
  ExecutiveAiSourceStatus,
} from "./executive-ai-types";

async function soft<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export function mapFinanceiroFeed(
  cockpit: ExecutiveFinancialCockpitData | null,
): ExecutiveAiFinanceiroFeed | null {
  if (!cockpit || cockpit.status === "unavailable") {
    return cockpit
      ? {
          status: "unavailable",
          saldoAtual: null,
          saldoProjetado7d: null,
          saldoProjetado30d: null,
          pagarVencidoQtd: null,
          pagarVencidoValor: null,
          receberVencidoQtd: null,
          receberVencidoValor: null,
          notice: cockpit.notice,
        }
      : null;
  }
  return {
    status: cockpit.status,
    saldoAtual: cockpit.saldoAtual,
    saldoProjetado7d: cockpit.dias7.saldoProjetado,
    saldoProjetado30d: cockpit.dias30.saldoProjetado,
    pagarVencidoQtd: cockpit.vencidas?.pagarQtd ?? null,
    pagarVencidoValor: cockpit.vencidas?.pagarValor ?? null,
    receberVencidoQtd: cockpit.vencidas?.receberQtd ?? null,
    receberVencidoValor: cockpit.vencidas?.receberValor ?? null,
    notice: cockpit.notice,
  };
}

export function mapComercialFeed(
  ci: CommercialIntelligenceData | null,
  hoje: DashboardHojeSnapshot | null,
): ExecutiveAiComercialFeed | null {
  if (!ci) return null;

  const meta = ci.meta;
  const metaDisponivel = Boolean(meta?.available);
  const metaPct = meta?.percentual ?? null;
  const metaAtingida =
    metaDisponivel && metaPct != null && metaPct >= 100;
  // Abaixo do ritmo: status conhecido abaixo/atenção OU % < 90 com meta
  const metaAbaixoRitmo =
    metaDisponivel &&
    ((meta?.status != null &&
      ["abaixo", "atencao", "muito_abaixo", "abaixo_do_ritmo", "muito_abaixo_do_ritmo"].includes(
        String(meta.status),
      )) ||
      (metaPct != null && metaPct < 90 && !metaAtingida) ||
      (hoje?.hoje.percentual != null &&
        hoje.hoje.meta != null &&
        hoje.hoje.percentual < 90));

  let status: ExecutiveAiSourceStatus = "available";
  if (ci.cobertura.coberturaOrigemBaixa) status = "partial";
  if (!ci.kpis.taxaConversaoComercial.available) status = "partial";

  return {
    status,
    faturamentoPeriodo: ci.kpis.faturamentoPeriodo.available
      ? ci.kpis.faturamentoPeriodo.value
      : null,
    valorEmNegociacao: ci.kpis.valorEmNegociacao.available
      ? ci.kpis.valorEmNegociacao.value
      : null,
    valorPerdido: ci.kpis.valorPerdido.available
      ? ci.kpis.valorPerdido.value
      : null,
    taxaConversaoPct: ci.kpis.taxaConversaoComercial.available
      ? ci.kpis.taxaConversaoComercial.value
      : null,
    conversaoDisponivel: ci.kpis.taxaConversaoComercial.available,
    metaDisponivel,
    metaPercentual: metaPct,
    metaAtingida,
    metaAbaixoRitmo: Boolean(metaAbaixoRitmo),
    coberturaOrigemPct: ci.cobertura.coberturaOrigemPct,
    coberturaOrigemBaixa: ci.cobertura.coberturaOrigemBaixa,
    coberturaResponsavelPct: ci.cobertura.coberturaResponsavelPct,
    orcamentosAguardando: ci.kpis.orcamentosAguardando.available
      ? ci.kpis.orcamentosAguardando.value
      : null,
  };
}

export function mapCrmFeed(
  portfolio: {
    kpis: {
      clientesAtivos: number;
      clientesInativos180: number;
      clientesRecorrentes: number;
      ultimaVisitaCarteira: string | null;
    };
    riscos: Array<{ motivo: string }>;
    oportunidades: Array<{ tipo: string }>;
    intel?: Array<{
      segmento?: string;
      hasVipTag?: boolean;
      diasSemRetorno?: number | null;
    }>;
  } | null,
): ExecutiveAiCrmFeed | null {
  if (!portfolio) return null;
  const riscos = portfolio.riscos ?? [];
  const opps = portfolio.oportunidades ?? [];

  const vipFromOpp = opps.filter((o) => o.tipo === "vip_sem_retorno").length;
  const vipFromIntel = (portfolio.intel ?? []).filter(
    (c) =>
      (c.segmento === "VIP" || c.hasVipTag) &&
      c.diasSemRetorno != null &&
      c.diasSemRetorno >= 90,
  ).length;
  const vipSemRetorno = Math.max(vipFromOpp, vipFromIntel);

  const revisoes =
    riscos.filter((r) => r.motivo === "revisao_vencida").length +
    opps.filter((o) => o.tipo === "revisao_vencida").length;
  const orcamentos = riscos.filter(
    (r) =>
      r.motivo === "orcamento_aguardando" ||
      r.motivo === "orcamento_aprovado_sem_os",
  ).length;

  let status: ExecutiveAiSourceStatus = "available";
  if (portfolio.kpis.ultimaVisitaCarteira == null) status = "partial";

  return {
    status,
    clientesAtivos: portfolio.kpis.clientesAtivos,
    clientesInativos180: portfolio.kpis.clientesInativos180,
    clientesRecorrentes: portfolio.kpis.clientesRecorrentes,
    clientesEmRisco: riscos.length,
    vipSemRetorno,
    revisoesVencidas: revisoes,
    orcamentosPendentes: orcamentos,
    oportunidades: opps.length,
    ultimaVisitaCarteira: portfolio.kpis.ultimaVisitaCarteira,
  };
}

export function mapOperacaoFeed(
  execCtx: ExecutiveDashboardContext | null,
): ExecutiveAiOperacaoFeed | null {
  if (!execCtx) return null;
  const feeds = toDecisionFeeds(execCtx);
  const ofi = feeds.oficina;
  const rec = feeds.recursos;
  if (!ofi && !rec) return null;

  let status: ExecutiveAiSourceStatus = ofi ? "available" : "partial";
  if (!ofi) status = "partial";

  const capacidadeLimite = Boolean(
    rec && rec.taxaOcupacao >= 90 && rec.totalAtivos > 0,
  );

  // Contagem confiável: cards do board sem mecânico e sem consultor.
  let semResponsavel: number | null = null;
  if (execCtx.centro?.board) {
    let n = 0;
    let scanned = 0;
    for (const cards of Object.values(execCtx.centro.board)) {
      for (const c of cards) {
        scanned += 1;
        if (!c.mecanicoId && !c.consultorId) n += 1;
      }
    }
    if (scanned > 0) semResponsavel = n;
  }

  return {
    status,
    aguardandoAprovacao: ofi?.aguardandoAprovacao ?? null,
    atrasadas: ofi?.atrasadas ?? null,
    paradas:
      ofi != null
        ? (ofi.aguardandoPecas ?? 0) + (ofi.semAtualizacao ?? 0)
        : null,
    semResponsavel,
    taxaOcupacaoPct: rec?.taxaOcupacao ?? null,
    capacidadeLimite,
    // Valor em aprovação não é confiável (valor_total ≠ itens pendentes).
    valorAguardandoAprovacao: null,
  };
}

export function mapEstoqueFeed(
  stock: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof createExecutiveStockService>>["load"]
    >
  > | null,
  thinFallback: { abaixoMinimo: number; zerados: number } | null,
): ExecutiveAiEstoqueFeed | null {
  if (stock) {
    const alerts = stock.alerts ?? [];
    const cadastro = alerts.filter((a) => a.tipo === "cadastro_inconsistente")
      .length;
    const fornecedorUnico = alerts.some((a) => a.tipo === "fornecedor_unico");
    let status: ExecutiveAiSourceStatus = "available";
    if (
      stock.kpis.valorTotalEstoque.partial ||
      !stock.kpis.coberturaEstoque.available ||
      !stock.kpis.giroMedio.available
    ) {
      status = "partial";
    }
    return {
      status,
      zerados: stock.kpis.produtosZerados.available
        ? stock.kpis.produtosZerados.value
        : null,
      abaixoMinimo: stock.kpis.produtosAbaixoMinimo.available
        ? stock.kpis.produtosAbaixoMinimo.value
        : null,
      valorParado: stock.kpis.valorFinanceiroParado.available
        ? stock.kpis.valorFinanceiroParado.value
        : null,
      valorParadoDisponivel: stock.kpis.valorFinanceiroParado.available,
      cadastroInconsistente: cadastro,
      coberturaDisponivel: stock.kpis.coberturaEstoque.available,
      giroDisponivel: stock.kpis.giroMedio.available,
      fornecedorUnico,
      skusAtivos: stock.kpis.skusAtivos.available
        ? stock.kpis.skusAtivos.value
        : null,
    };
  }
  if (thinFallback) {
    return {
      status: "partial",
      zerados: thinFallback.zerados,
      abaixoMinimo: thinFallback.abaixoMinimo,
      valorParado: null,
      valorParadoDisponivel: false,
      cadastroInconsistente: null,
      coberturaDisponivel: false,
      giroDisponivel: false,
      fornecedorUnico: false,
      skusAtivos: null,
    };
  }
  return null;
}

export type ExecutiveAiBuildParams = {
  tenantId: string;
  tenantSlug: string;
  cockpit: ExecutiveFinancialCockpitData | null;
  execCtx: ExecutiveDashboardContext | null;
  hoje: DashboardHojeSnapshot | null;
  /** CI já carregado — evita fetch duplicado. */
  commercial?: CommercialIntelligenceData | null;
};

/**
 * Soft-fetch CRM + Executive Stock + CI (se não fornecido) em paralelo.
 */
export async function buildExecutiveAiResult(
  params: ExecutiveAiBuildParams,
): Promise<ExecutiveAiResult> {
  const { tenantId, tenantSlug, cockpit, execCtx, hoje } = params;

  const [ci, crm, stock] = await Promise.all([
    params.commercial !== undefined
      ? Promise.resolve(params.commercial)
      : soft(async () => {
          const svc = await createCommercialIntelligenceService(tenantId);
          return svc.load({ preset: "mes" });
        }),
    soft(async () => {
      const svc = await createCrmExecutivoService(tenantId);
      return svc.loadPortfolio();
    }),
    soft(async () => {
      const svc = await createExecutiveStockService(tenantId);
      return svc.load(tenantSlug, {});
    }),
  ]);

  const input: ExecutiveAiInput = {
    tenantSlug,
    generatedAt: new Date().toISOString(),
    financeiro: mapFinanceiroFeed(cockpit),
    comercial: mapComercialFeed(ci, hoje),
    crm: mapCrmFeed(crm),
    operacao: mapOperacaoFeed(execCtx),
    estoque: mapEstoqueFeed(stock, execCtx?.estoque ?? null),
  };

  return runExecutiveAiEngine(input);
}
