/**
 * Sprint 25.5.1 — Mapeamento visual premium → dados reais (sem inventar).
 */

import type {
  DashboardCharts,
  DashboardKpiComparison,
  DashboardPrimaryData,
} from "@/types/dashboard-executive";
import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import type { ExecutiveFinancialCockpitData } from "@/lib/dashboard/executive-financial-cockpit-types";
import type { ExecutiveIntelligenceData } from "@/lib/dashboard/executive-intelligence-types";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import { formatCurrency, formatCurrencyCompact, formatPercent } from "@/lib/dashboard/format";
import { segmentDashboardFlags } from "@/lib/segments/dashboard.ts";
import {
  composeEnterpriseInsights,
  presentEnterpriseInsightCards,
} from "@/lib/enterprise";

export type PremiumKpiItem = {
  id: string;
  title: string;
  value: string;
  supportingText: string;
  tone: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
  trend?: { label: string; direction?: "up" | "down" | "flat" };
  href?: string;
  unavailable?: boolean;
};

function trendFromComparison(
  c: DashboardKpiComparison | undefined,
): PremiumKpiItem["trend"] {
  if (!c || c.variationPct == null) return undefined;
  const direction =
    c.trend === "up" ? "up" : c.trend === "down" ? "down" : "flat";
  return {
    label: `${formatPercent(c.variationPct)} vs período anterior`,
    direction,
  };
}

export function buildPremiumTopKpis(input: {
  primary: DashboardPrimaryData | null;
  hoje: DashboardHojeSnapshot;
  tenantSlug: string;
}): PremiumKpiItem[] {
  const { primary, hoje, tenantSlug } = input;
  const k = primary?.kpis;
  const c = primary?.comparisons;
  const base = `/${tenantSlug}`;

  return [
    {
      id: "faturamento",
      title: "Faturamento do mês",
      value:
        k != null
          ? formatCurrencyCompact(hoje.mes.faturamento)
          : formatCurrencyCompact(hoje.mes.faturamento),
      supportingText: "Mês corrente · vendas",
      tone: "primary",
      trend: trendFromComparison(c?.faturamento),
      href: `${base}/vendas`,
    },
    {
      id: "lucro",
      title: "Lucro líquido",
      value: "Indisponível",
      supportingText: "DRE completo não disponível neste ciclo",
      tone: "neutral",
      unavailable: true,
      href: `${base}/financeiro/dre`,
    },
    {
      id: "margem",
      title: "Margem líquida",
      value:
        k?.margem_media != null
          ? formatPercent(k.margem_media)
          : "Indisponível",
      supportingText:
        k?.margem_media != null
          ? "Margem de contribuição / receita líquida"
          : "Sem base DRE no período",
      tone: k?.margem_media != null && k.margem_media < 0 ? "danger" : "info",
      unavailable: k?.margem_media == null,
      trend: trendFromComparison(c?.margem_media),
      href: `${base}/financeiro/dre`,
    },
    {
      id: "ebitda",
      title: "EBITDA",
      value: k != null ? formatCurrencyCompact(k.ebitda) : "Indisponível",
      supportingText: k != null ? "Período filtrado do dashboard" : "Sem dados",
      tone: "neutral",
      unavailable: k == null,
      trend: trendFromComparison(c?.ebitda),
      href: `${base}/financeiro`,
    },
    {
      id: "caixa",
      title: "Caixa disponível",
      value:
        k?.saldo_bancario != null
          ? formatCurrencyCompact(k.saldo_bancario)
          : "Indisponível",
      supportingText: "Saldo bancário consolidado",
      tone:
        k?.saldo_bancario != null && k.saldo_bancario < 0 ? "danger" : "success",
      unavailable: k?.saldo_bancario == null,
      href: `${base}/financeiro/fluxo-caixa`,
    },
    {
      id: "meta",
      title: "Meta do mês",
      value:
        hoje.mes.meta != null
          ? formatCurrencyCompact(hoje.mes.meta)
          : "Meta não cadastrada",
      supportingText:
        hoje.mes.percentual != null
          ? `${formatPercent(hoje.mes.percentual)} da meta`
          : "Cadastre em Configurações · Metas",
      tone:
        hoje.mes.meta == null
          ? "neutral"
          : hoje.mes.percentual != null && hoje.mes.percentual >= 100
            ? "success"
            : "warning",
      unavailable: hoje.mes.meta == null,
      href: `${base}/configuracoes/metas`,
    },
  ];
}

export type PremiumInsightCard = {
  id: string;
  title: string;
  body: string;
  origem: string;
  periodo: string;
  confianca: string;
  href?: string;
  severity: "info" | "warning" | "danger" | "success";
};

export function buildPremiumInsights(input: {
  cockpit: ExecutiveFinancialCockpitData;
  intelligence: ExecutiveIntelligenceData;
  decision: ExecutiveDecisionResult;
  estoqueAbaixoMinimo?: number | null;
  primary?: DashboardPrimaryData | null;
  /** Séries já calculadas — sinais 29.4 (sem novo I/O). */
  charts?: DashboardCharts | null;
  tenantSlug: string;
  segment?: string | null;
  segmentVersion?: number | null;
  segmentConfig?: unknown;
}): PremiumInsightCard[] {
  const {
    cockpit,
    intelligence,
    decision,
    estoqueAbaixoMinimo = null,
    primary = null,
    charts = null,
    tenantSlug,
  } = input;
  const flags = segmentDashboardFlags({
    segment: input.segment,
    segmentVersion: input.segmentVersion,
    segmentConfig: input.segmentConfig,
  });
  const cards: PremiumInsightCard[] = [];

  cards.push({
    id: "caixa",
    title: "Saúde de caixa",
    body: cockpit.saudeReason,
    origem: "Cockpit Financeiro · saldo e projeção",
    periodo: "Hoje / 7 dias",
    confianca:
      cockpit.status === "available"
        ? "Alta"
        : cockpit.status === "partial"
          ? "Parcial"
          : "Baixa",
    severity:
      cockpit.saude === "critico"
        ? "danger"
        : cockpit.saude === "atencao"
          ? "warning"
          : cockpit.saude === "saudavel"
            ? "success"
            : "info",
    href: `/${tenantSlug}/financeiro/fluxo-caixa`,
  });

  if (cockpit.dias7.saldoProjetado != null && cockpit.dias7.saldoProjetado < 0) {
    cards.push({
      id: "risco-saldo",
      title: "Risco de saldo negativo",
      body: `Projeção 7 dias em ${formatCurrency(cockpit.dias7.saldoProjetado)}.`,
      origem: "Cockpit Financeiro",
      periodo: "7 dias",
      confianca: "Alta",
      severity: "danger",
      href: `/${tenantSlug}/financeiro/fluxo-caixa`,
    });
  }

  if (flags.inventory) {
    cards.push({
      id: "estoque",
      title: "Estoque abaixo do mínimo",
      body:
        estoqueAbaixoMinimo != null
          ? `${estoqueAbaixoMinimo} SKU(s) abaixo do mínimo cadastrado.`
          : "Indicador de estoque mínimo indisponível neste ciclo.",
      origem: "Estoque · dashboard",
      periodo: "Hoje",
      confianca: estoqueAbaixoMinimo != null ? "Alta" : "Baixa",
      severity:
        estoqueAbaixoMinimo != null && estoqueAbaixoMinimo > 0
          ? "warning"
          : "info",
      href: `/${tenantSlug}/estoque`,
    });
  }

  const op = intelligence.saudeOperacao;
  const operacaoBody =
    op.status === "unavailable"
      ? "Indicadores operacionais indisponíveis."
      : flags.workOrders
        ? `${op.osAbertas ?? "—"} OS abertas · ${op.osAtrasadas ?? "—"} atrasadas · ${op.osAguardandoCliente ?? op.clientesAguardandoRetorno ?? "—"} aguardando cliente`
        : `${op.clientesAguardandoRetorno ?? op.osAguardandoCliente ?? "—"} aguardando retorno`;
  cards.push({
    id: "operacao",
    title: "Clientes sem retorno / aguardando",
    body: operacaoBody,
    origem: "Centro de Operações",
    periodo: "Hoje",
    confianca: op.status === "available" ? "Alta" : "Parcial",
    severity: flags.workOrders && (op.osAtrasadas ?? 0) > 0 ? "warning" : "info",
    href: `/${tenantSlug}/centro-operacoes`,
  });

  cards.push({
    id: "obrigacoes",
    title: "Obrigações tributárias",
    body: "Indisponível — nenhuma fonte confiável de obrigações fiscais neste ciclo.",
    origem: "Calendário fiscal",
    periodo: "—",
    confianca: "Baixa",
    severity: "info",
    href: `/${tenantSlug}/financeiro`,
  });

  const margem = primary?.kpis.margem_media;
  cards.push({
    id: "margem",
    title: "Margem",
    body:
      margem != null
        ? `Margem média ${formatPercent(margem)} no período filtrado.`
        : "Margem indisponível sem base DRE/contribuição no período.",
    origem: "Dashboard Primary · DRE",
    periodo: primary?.periodo.label ?? "Período filtrado",
    confianca: margem != null ? "Média" : "Baixa",
    severity: margem != null && margem < 0 ? "danger" : "info",
    href: `/${tenantSlug}/financeiro/dre`,
  });

  cards.push({
    id: "filial",
    title: "Filial com melhor desempenho",
    body: "Indisponível — ranking por filial não carregado neste ciclo.",
    origem: "Multifilial",
    periodo: "—",
    confianca: "Baixa",
    severity: "info",
    href: `/${tenantSlug}/dashboard`,
  });

  const receita = intelligence.receitaPotencial;
  cards.push({
    id: "oportunidade",
    title: "Oportunidade de receita",
    body:
      receita.totalValor != null
        ? `Potencial ${formatCurrency(receita.totalValor)} em aprovação/orçamentos`
        : "Potencial comercial indisponível neste ciclo.",
    origem: "Inteligência Executiva",
    periodo: "Aberto",
    confianca: receita.status === "available" ? "Média" : "Baixa",
    severity: "info",
    href: `/${tenantSlug}/ordens`,
  });

  for (const item of decision.items.slice(0, 4)) {
    cards.push({
      id: `decision-${item.id}`,
      title: item.title,
      body: item.description,
      origem: item.source || "Centro de Decisão",
      periodo: item.referenceDate ?? "Hoje",
      confianca: item.severity === "critical" ? "Alta" : "Média",
      severity:
        item.severity === "critical"
          ? "danger"
          : item.severity === "warning"
            ? "warning"
            : item.severity === "opportunity"
              ? "success"
              : "info",
      href: item.href,
    });
  }

  // Sprint 29.4/29.5 — sinais derivados de séries já carregadas (aditivo; sem novo I/O).
  if (charts) {
    const pack = composeEnterpriseInsights({ charts });
    for (const card of presentEnterpriseInsightCards(pack)) {
      cards.push({
        id: card.id,
        title: card.title,
        body: card.body,
        origem: card.origem,
        periodo: card.periodo,
        confianca: card.confianca,
        severity: card.severity,
        href: card.href?.startsWith("/")
          ? `/${tenantSlug}${card.href}`
          : card.href,
      });
    }
  }

  return cards;
}

export type PremiumOpsCard = {
  id: string;
  title: string;
  value: string;
  hint: string;
  href: string;
  unavailable?: boolean;
};

export function buildPremiumOpsCards(input: {
  hoje: DashboardHojeSnapshot;
  primary: DashboardPrimaryData | null;
  intelligence: ExecutiveIntelligenceData;
  estoqueAbaixoMinimo: number | null;
  tenantSlug: string;
  segment?: string | null;
  segmentVersion?: number | null;
  segmentConfig?: unknown;
}): PremiumOpsCard[] {
  const { hoje, primary, intelligence, estoqueAbaixoMinimo, tenantSlug } =
    input;
  const flags = segmentDashboardFlags({
    segment: input.segment,
    segmentVersion: input.segmentVersion,
    segmentConfig: input.segmentConfig,
  });
  const op = intelligence.saudeOperacao;
  const cards: PremiumOpsCard[] = [
    {
      id: "vendas-hoje",
      title: "Vendas de hoje",
      value: formatCurrency(hoje.hoje.faturamento),
      hint:
        hoje.hoje.meta != null
          ? `Meta do dia ${formatCurrency(hoje.hoje.meta)}`
          : hoje.hoje.status === "fim_semana"
            ? "Fim de semana · sem meta diária"
            : hoje.hoje.status === "dia_fechado"
              ? "Dia fechado · sem meta diária"
              : hoje.mes.meta != null
                ? "Sem meta diária · mensal vigente"
                : "Meta não cadastrada",
      href: `/${tenantSlug}/vendas`,
    },
  ];
  if (flags.workOrders) {
    cards.push({
      id: "pedidos",
      title: "Pedidos / OS em aberto",
      value: op.osAbertas != null ? String(op.osAbertas) : "Indisponível",
      hint:
        op.osAtrasadas != null
          ? `${op.osAtrasadas} atrasadas`
          : "Centro de operações",
      href: `/${tenantSlug}/ordens`,
      unavailable: op.osAbertas == null,
    });
  }
  if (flags.inventory) {
    cards.push({
      id: "estoque",
      title: "Estoque baixo",
      value:
        estoqueAbaixoMinimo != null
          ? String(estoqueAbaixoMinimo)
          : "Indisponível",
      hint:
        estoqueAbaixoMinimo != null
          ? "SKUs abaixo do mínimo"
          : "Indicador de estoque não carregado",
      href: `/${tenantSlug}/estoque`,
      unavailable: estoqueAbaixoMinimo == null,
    });
  }
  cards.push({
    id: "clientes",
    title: "Clientes ativos",
    value:
      primary?.kpis.quantidade_clientes != null
        ? String(primary.kpis.quantidade_clientes)
        : "Indisponível",
    hint: "Clientes com movimento no período",
    href: `/${tenantSlug}/clientes`,
    unavailable: primary?.kpis.quantidade_clientes == null,
  });
  return cards;
}
