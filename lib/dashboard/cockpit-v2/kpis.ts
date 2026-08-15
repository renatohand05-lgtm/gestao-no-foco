/**
 * Sprint 30.4 — KPIs do cockpit (apresentação).
 * Reutiliza primary/hoje/intelligence — não recalcula DRE/caixa.
 */

import { getSegmentCockpitCopy } from "@/config/dashboard/cockpit-v2";
import type { DashboardPrimaryData } from "@/types/dashboard-executive";
import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import type { ExecutiveIntelligenceData } from "@/lib/dashboard/executive-intelligence-types";
import type { ExecutiveFinancialCockpitData } from "@/lib/dashboard/executive-financial-cockpit-types";
import {
  buildPremiumTopKpis,
  type PremiumKpiItem,
} from "@/lib/dashboard/premium-dashboard-map";
import { formatCurrencyCompact, formatPercent } from "@/lib/dashboard/format";
import { filterDashboardSurface } from "@/lib/segments/dashboard.ts";
import { getSegmentUiCopy } from "@/lib/segments/copy.ts";

export type CockpitKpiItem = PremiumKpiItem & {
  comparisonLabel: string;
  drillHref: string;
  exportHref?: string;
};

function withContext(
  item: PremiumKpiItem,
  comparisonLabel: string,
): CockpitKpiItem {
  return {
    ...item,
    comparisonLabel,
    drillHref: item.href ?? "#",
    exportHref: item.href,
    supportingText:
      item.supportingText ||
      (item.unavailable ? "Dado indisponível neste ciclo" : "Contexto do período"),
  };
}

export function buildCockpitKpis(input: {
  primary: DashboardPrimaryData | null;
  hoje: DashboardHojeSnapshot;
  intelligence: ExecutiveIntelligenceData;
  cockpit: ExecutiveFinancialCockpitData;
  tenantSlug: string;
  segment: string | null;
  segmentVersion?: number | null;
  segmentConfig?: unknown;
}): CockpitKpiItem[] {
  const { primary, hoje, intelligence, cockpit, tenantSlug, segment } = input;
  const copy = getSegmentCockpitCopy(segment);
  const ui = getSegmentUiCopy({
    segment,
    segmentVersion: input.segmentVersion,
    segmentConfig: input.segmentConfig,
  });
  const base = buildPremiumTopKpis({ primary, hoje, tenantSlug });
  const k = primary?.kpis;
  const c = primary?.comparisons;
  const op = intelligence.saudeOperacao;
  const root = `/${tenantSlug}`;

  const mapped = base.map((item) => {
    if (item.trend?.label) {
      return withContext(item, item.trend.label);
    }
    if (item.id === "faturamento" && hoje.comparacoes.vs_ontem_pct != null) {
      return withContext(
        {
          ...item,
          trend: {
            label: `${formatPercent(hoje.comparacoes.vs_ontem_pct)} vs ontem`,
            direction:
              hoje.comparacoes.vs_ontem_pct > 0
                ? "up"
                : hoje.comparacoes.vs_ontem_pct < 0
                  ? "down"
                  : "flat",
          },
        },
        `${formatPercent(hoje.comparacoes.vs_ontem_pct)} vs ontem`,
      );
    }
    if (item.unavailable) {
      return withContext(item, "Sem comparação — dado indisponível");
    }
    return withContext(item, "Sem variação no ciclo filtrado");
  });

  const extras: CockpitKpiItem[] = [
    withContext(
      {
        id: "clientes",
        title: "Clientes",
        value:
          k?.quantidade_clientes != null
            ? String(k.quantidade_clientes)
            : "Indisponível",
        supportingText:
          k?.quantidade_clientes != null
            ? "Clientes com movimento no período"
            : "Sem base de clientes no período",
        tone: "info",
        unavailable: k?.quantidade_clientes == null,
        trend:
          c?.quantidade_vendas != null && c.quantidade_vendas.variationPct != null
            ? {
                label: `${formatPercent(c.quantidade_vendas.variationPct)} volume vendas`,
                direction:
                  c.quantidade_vendas.trend === "up"
                    ? "up"
                    : c.quantidade_vendas.trend === "down"
                      ? "down"
                      : "flat",
              }
            : undefined,
        href: `${root}/clientes`,
      },
      k?.quantidade_clientes != null
        ? "Período filtrado do dashboard"
        : "Sem comparação — dado indisponível",
    ),
    withContext(
      {
        id: "ordens",
        title: ui.engine ? ui.openWorkOrdersLabel : copy.kpiOrdersTitle,
        value: op.osAbertas != null ? String(op.osAbertas) : "Indisponível",
        supportingText:
          op.osAtrasadas != null
            ? `${op.osAtrasadas} atrasada(s)`
            : "Centro de operações",
        tone: (op.osAtrasadas ?? 0) > 0 ? "warning" : "neutral",
        unavailable: op.osAbertas == null,
        href: `${root}/ordens`,
      },
      op.osAbertas != null
        ? "Snapshot operacional de hoje"
        : "Sem comparação — indicador indisponível",
    ),
    withContext(
      {
        id: "pendencias",
        title: "Pendências",
        value:
          cockpit.vencidas != null
            ? String(cockpit.vencidas.pagarQtd + cockpit.vencidas.receberQtd)
            : "Indisponível",
        supportingText:
          cockpit.vencidas != null
            ? `${formatCurrencyCompact(cockpit.vencidas.pagarValor)} a pagar · ${formatCurrencyCompact(cockpit.vencidas.receberValor)} a receber`
            : "Contas vencidas não carregadas",
        tone:
          cockpit.vencidas != null &&
          cockpit.vencidas.pagarQtd + cockpit.vencidas.receberQtd > 0
            ? "warning"
            : "success",
        unavailable: cockpit.vencidas == null,
        href: `${root}/financeiro`,
      },
      cockpit.vencidas != null
        ? "Contas vencidas (CR/CP)"
        : "Sem comparação — dado indisponível",
    ),
  ];

  // Ordem executiva pedida na missão
  const order = [
    "faturamento",
    "lucro",
    "caixa",
    "ebitda",
    "margem",
    "clientes",
    "ordens",
    "pendencias",
    "meta",
  ];
  const all = [...mapped, ...extras];
  const ordered = order
    .map((id) => all.find((k) => k.id === id))
    .filter((x): x is CockpitKpiItem => Boolean(x));
  return filterDashboardSurface(ordered, {
    segment,
    segmentVersion: input.segmentVersion,
    segmentConfig: input.segmentConfig,
  });
}
