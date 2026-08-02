/**
 * Sprint 30.4 — Painéis de apresentação (brief, metas, DRE, caixa).
 * Somente composição de dados já carregados.
 */

import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import type {
  DashboardCharts,
  DashboardPrimaryData,
} from "@/types/dashboard-executive";
import type { ExecutiveFinancialCockpitData } from "@/lib/dashboard/executive-financial-cockpit-types";
import type { PremiumInsightCard } from "@/lib/dashboard/premium-dashboard-map";
import type { CockpitAlert } from "@/lib/dashboard/cockpit-v2/alerts";
import { formatCurrencyCompact, formatPercent } from "@/lib/dashboard/format";

export type BriefPeriodSummary = {
  id: "dia" | "semana" | "mes";
  label: string;
  value: string;
  detail: string;
  available: boolean;
};

export type ExecutiveBriefV2Model = {
  day: BriefPeriodSummary;
  week: BriefPeriodSummary;
  month: BriefPeriodSummary;
  topAlerts: CockpitAlert[];
  biggestOpportunity: { title: string; body: string; href: string } | null;
  biggestRisk: { title: string; body: string; href: string } | null;
  biggestGrowth: { title: string; body: string } | null;
  biggestDrop: { title: string; body: string } | null;
  nextAction: { label: string; href: string; reason: string };
};

function sumLastDays(
  serie: DashboardHojeSnapshot["serie_diaria"],
  days: number,
): number | null {
  if (!serie.length) return null;
  const slice = serie.slice(-days);
  if (!slice.length) return null;
  return slice.reduce((acc, p) => acc + (p.realizado ?? 0), 0);
}

export function buildExecutiveBriefV2(input: {
  hoje: DashboardHojeSnapshot;
  alerts: CockpitAlert[];
  insights: PremiumInsightCard[];
  tenantSlug: string;
}): ExecutiveBriefV2Model {
  const { hoje, alerts, insights, tenantSlug } = input;
  const weekSum = sumLastDays(hoje.serie_diaria, 7);

  const day: BriefPeriodSummary = {
    id: "dia",
    label: "Resumo do dia",
    value: formatCurrencyCompact(hoje.hoje.faturamento),
    detail:
      hoje.hoje.quantidade_vendas > 0
        ? `${hoje.hoje.quantidade_vendas} venda(s) · ticket ${formatCurrencyCompact(hoje.hoje.ticket_medio)}`
        : "Sem vendas registradas hoje",
    available: true,
  };

  const week: BriefPeriodSummary = {
    id: "semana",
    label: "Resumo da semana",
    value:
      weekSum != null
        ? formatCurrencyCompact(weekSum)
        : "Indisponível",
    detail:
      weekSum != null
        ? "Soma dos últimos 7 dias da série diária já carregada"
        : "Série diária insuficiente neste ciclo",
    available: weekSum != null,
  };

  const month: BriefPeriodSummary = {
    id: "mes",
    label: "Resumo do mês",
    value: formatCurrencyCompact(hoje.mes.faturamento),
    detail:
      hoje.mes.meta != null
        ? `Meta ${formatCurrencyCompact(hoje.mes.meta)}${
            hoje.mes.percentual != null
              ? ` · ${formatPercent(hoje.mes.percentual)}`
              : ""
          }`
        : "Meta do mês não cadastrada",
    available: true,
  };

  const opportunity =
    insights.find(
      (i) =>
        i.severity === "success" ||
        /oportunidade/i.test(i.title) ||
        i.id === "oportunidade",
    ) ?? null;
  const risk =
    alerts.find((a) => a.priority === "critica" || a.priority === "alta") ??
    null;

  const growthPct = hoje.comparacoes.vs_ontem_pct;
  const biggestGrowth =
    growthPct != null && growthPct > 0
      ? {
          title: "Maior crescimento",
          body: `Faturamento de hoje ${formatPercent(growthPct)} vs ontem (${formatCurrencyCompact(hoje.comparacoes.vs_ontem_valor)}).`,
        }
      : growthPct == null
        ? {
            title: "Maior crescimento",
            body: "Comparativo vs ontem indisponível neste ciclo.",
          }
        : null;

  const biggestDrop =
    growthPct != null && growthPct < 0
      ? {
          title: "Maior queda",
          body: `Faturamento de hoje ${formatPercent(growthPct)} vs ontem.`,
        }
      : growthPct != null && growthPct >= 0
        ? {
            title: "Maior queda",
            body: "Sem queda vs ontem no faturamento de hoje.",
          }
        : {
            title: "Maior queda",
            body: "Comparativo vs ontem indisponível neste ciclo.",
          };

  const top = alerts[0] ?? null;
  const nextAction = top
    ? {
        label: top.suggestedAction,
        href: top.href,
        reason: top.title,
      }
    : {
        label: "Abrir fluxo de caixa",
        href: `/${tenantSlug}/financeiro/fluxo-caixa`,
        reason: "Sem alertas acionáveis — revisar caixa",
      };

  return {
    day,
    week,
    month,
    topAlerts: alerts.slice(0, 4),
    biggestOpportunity: opportunity
      ? {
          title: opportunity.title,
          body: opportunity.body,
          href: opportunity.href ?? `/${tenantSlug}/ordens`,
        }
      : {
          title: "Maior oportunidade",
          body: "Nenhuma oportunidade evidenciada neste ciclo.",
          href: `/${tenantSlug}/crm`,
        },
    biggestRisk: risk
      ? { title: risk.title, body: risk.description, href: risk.href }
      : {
          title: "Maior risco",
          body: "Nenhum risco crítico evidenciado neste ciclo.",
          href: `/${tenantSlug}/financeiro`,
        },
    biggestGrowth,
    biggestDrop,
    nextAction,
  };
}

export type MetaPanelModel = {
  meta: string;
  realizado: string;
  pct: string;
  projecao: string;
  diasRestantes: string;
  valorRestante: string;
  vsMesAnterior: string;
  tone: "success" | "warning" | "danger" | "neutral" | "info";
  available: boolean;
  href: string;
};

function daysRemainingInMonth(civilDate: string): number | null {
  const [y, m, d] = civilDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Math.max(0, last - d);
}

export function buildMetaPanel(input: {
  hoje: DashboardHojeSnapshot;
  tenantSlug: string;
}): MetaPanelModel {
  const { hoje, tenantSlug } = input;
  const dias = daysRemainingInMonth(hoje.data_hoje);
  const hasMeta = hoje.mes.meta != null && hoje.mes.meta > 0;
  const restante =
    hasMeta && hoje.mes.meta != null
      ? Math.max(0, hoje.mes.meta - hoje.mes.faturamento)
      : null;
  const vs =
    hoje.comparacoes.vs_mesmo_dia_semana_anterior_pct != null
      ? `${formatPercent(hoje.comparacoes.vs_mesmo_dia_semana_anterior_pct)} vs mesmo dia da semana anterior`
      : "Comparativo com mês anterior indisponível neste ciclo";

  return {
    meta: hasMeta
      ? formatCurrencyCompact(hoje.mes.meta!)
      : "Meta não cadastrada",
    realizado: formatCurrencyCompact(hoje.mes.faturamento),
    pct:
      hoje.mes.percentual != null
        ? formatPercent(hoje.mes.percentual)
        : "Indisponível",
    projecao:
      hoje.mes.projecao_fechamento != null
        ? formatCurrencyCompact(hoje.mes.projecao_fechamento)
        : "Indisponível",
    diasRestantes:
      dias != null ? `${dias} dia(s)` : "Indisponível",
    valorRestante:
      restante != null
        ? formatCurrencyCompact(restante)
        : "Indisponível",
    vsMesAnterior: vs,
    tone: !hasMeta
      ? "neutral"
      : hoje.mes.percentual != null && hoje.mes.percentual >= 100
        ? "success"
        : hoje.mes.percentual != null && hoje.mes.percentual >= 70
          ? "info"
          : "warning",
    available: hasMeta,
    href: `/${tenantSlug}/configuracoes/metas`,
  };
}

export type DreExecutiveCardModel = {
  receita: string;
  custos: string;
  despesas: string;
  lucro: string;
  ebitda: string;
  margem: string;
  comparativo: string;
  available: boolean;
  href: string;
  spark: Array<{ label: string; value: number }>;
  notice: string | null;
};

export function buildDreExecutiveCard(input: {
  primary: DashboardPrimaryData | null;
  charts: DashboardCharts | null;
  tenantSlug: string;
}): DreExecutiveCardModel {
  const { primary, charts, tenantSlug } = input;
  const k = primary?.kpis;
  const c = primary?.comparisons;
  if (!k) {
    return {
      receita: "Indisponível",
      custos: "Indisponível",
      despesas: "Indisponível",
      lucro: "Indisponível",
      ebitda: "Indisponível",
      margem: "Indisponível",
      comparativo: "DRE do período não carregado",
      available: false,
      href: `/${tenantSlug}/financeiro/dre`,
      spark: [],
      notice: "Abra o DRE completo para a leitura oficial.",
    };
  }

  // Despesas/lucro líquido: não inventar — abrir DRE canônico.
  return {
    receita: formatCurrencyCompact(k.receita_liquida ?? k.faturamento),
    custos: formatCurrencyCompact(k.cmv),
    despesas: "Ver DRE",
    lucro: "Ver DRE",
    ebitda: formatCurrencyCompact(k.ebitda),
    margem:
      k.margem_media != null ? formatPercent(k.margem_media) : "Indisponível",
    comparativo:
      c?.faturamento?.variationPct != null
        ? `Receita ${formatPercent(c.faturamento.variationPct)} vs período anterior`
        : "Comparativo parcial — abra o DRE",
    available: true,
    href: `/${tenantSlug}/financeiro/dre`,
    spark: (charts?.ebitdaEvolucao ?? []).slice(-8).map((p) => ({
      label: p.label,
      value: p.value,
    })),
    notice: null,
  };
}

export type CashExecutiveCardModel = {
  saldoAtual: string;
  entradas: string;
  saidas: string;
  saldoProjetado: string;
  maiorVencimento: string;
  maiorRisco: string;
  tone: "success" | "warning" | "danger" | "neutral";
  href: string;
  notice: string | null;
};

export function buildCashExecutiveCard(input: {
  cockpit: ExecutiveFinancialCockpitData;
  tenantSlug: string;
}): CashExecutiveCardModel {
  const { cockpit, tenantSlug } = input;
  const risco =
    cockpit.dias7.saldoProjetado != null && cockpit.dias7.saldoProjetado < 0
      ? `Saldo 7d projetado ${formatCurrencyCompact(cockpit.dias7.saldoProjetado)}`
      : cockpit.saudeReason;

  const venc =
    cockpit.maiorCompromisso7d != null
      ? `${cockpit.maiorCompromisso7d.descricao} · ${formatCurrencyCompact(cockpit.maiorCompromisso7d.valor)} · ${cockpit.maiorCompromisso7d.dataVencimento}`
      : "Nenhum compromisso destacado nos próximos 7 dias";

  return {
    saldoAtual:
      cockpit.saldoAtual != null
        ? formatCurrencyCompact(cockpit.saldoAtual)
        : "Indisponível",
    entradas:
      cockpit.dias7.entradasPrevistas != null
        ? formatCurrencyCompact(cockpit.dias7.entradasPrevistas)
        : "Indisponível",
    saidas:
      cockpit.dias7.saidasPrevistas != null
        ? formatCurrencyCompact(cockpit.dias7.saidasPrevistas)
        : "Indisponível",
    saldoProjetado:
      cockpit.dias7.saldoProjetado != null
        ? formatCurrencyCompact(cockpit.dias7.saldoProjetado)
        : "Indisponível",
    maiorVencimento: venc,
    maiorRisco: risco,
    tone:
      cockpit.saude === "critico"
        ? "danger"
        : cockpit.saude === "atencao"
          ? "warning"
          : cockpit.saude === "saudavel"
            ? "success"
            : "neutral",
    href: `/${tenantSlug}/financeiro/fluxo-caixa`,
    notice: cockpit.notice,
  };
}
