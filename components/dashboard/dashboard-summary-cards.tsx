import { memo } from "react";

import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { buildDashboardDrillDownHref } from "@/lib/dashboard/drill-down";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/dashboard/format";
import { dsElevation, dsGrid, dsValueTone } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
  DashboardComparableKpiKey,
  DashboardComparisons,
  DashboardFilters,
  DashboardKpis,
} from "@/types/dashboard-executive";

type DashboardSummaryCardsProps = {
  tenantSlug: string;
  filters: DashboardFilters;
  kpis: DashboardKpis;
  comparisons: DashboardComparisons;
  periodoAnteriorLabel: string;
};

function comparisonProps(
  comparisons: DashboardComparisons,
  key: DashboardComparableKpiKey,
  format: (value: number) => string,
  hint?: string,
) {
  const comparison = comparisons[key];
  return {
    comparison,
    previousFormatted: format(comparison.previous),
    comparisonHint: hint ?? `vs ${format(comparison.previous)} no período anterior`,
  };
}

function DashboardSummaryCardsComponent({
  tenantSlug,
  filters,
  kpis,
  comparisons,
  periodoAnteriorLabel,
}: DashboardSummaryCardsProps) {
  const vsLabel = `vs período anterior (${periodoAnteriorLabel})`;
  const drill = (target: Parameters<typeof buildDashboardDrillDownHref>[1]) =>
    buildDashboardDrillDownHref(tenantSlug, target, filters);

  return (
    <div
      className={dsGrid.kpis}
      role="region"
      aria-label="Indicadores principais"
    >
      <DashboardKpiCard
        title="Faturamento"
        value={formatCurrency(kpis.faturamento)}
        hint="DRE · receita_bruta por competência"
        tooltip="Soma da receita bruta no período, incluindo vendas faturadas e receitas avulsas registradas no DRE."
        icon="revenue"
        valueClassName={dsValueTone(kpis.faturamento)}
        href={drill("dre")}
        {...comparisonProps(comparisons, "faturamento", formatCurrency, vsLabel)}
      />
      <DashboardKpiCard
        title="Receita Líquida"
        value={formatCurrency(kpis.receita_liquida)}
        hint="DRE · receita bruta − deduções"
        tooltip="Receita bruta menos deduções e impostos sobre vendas, conforme o DRE do período."
        icon="net-revenue"
        valueClassName={dsValueTone(kpis.receita_liquida)}
        href={drill("dre")}
        {...comparisonProps(
          comparisons,
          "receita_liquida",
          formatCurrency,
          vsLabel,
        )}
      />
      <DashboardKpiCard
        title="EBITDA"
        value={formatCurrency(kpis.ebitda)}
        hint="DRE · margem de contribuição − despesas operacionais"
        tooltip="Resultado operacional antes de juros, impostos, depreciação e amortização."
        icon="ebitda"
        valueClassName={dsValueTone(kpis.ebitda)}
        href={drill("dre")}
        {...comparisonProps(comparisons, "ebitda", formatCurrency, vsLabel)}
      />
      <DashboardKpiCard
        title="CMV do período"
        value={formatCurrency(kpis.cmv)}
        hint="DRE · custo dos itens das vendas faturadas"
        tooltip="Custo das mercadorias vendidas no período, calculado a partir dos itens das vendas faturadas."
        icon="cmv"
        href={drill("dre")}
        {...comparisonProps(comparisons, "cmv", formatCurrency, vsLabel)}
      />
      <DashboardKpiCard
        title="Margem média"
        value={formatPercent(kpis.margem_media)}
        hint="DRE · margem de contribuição / receita líquida"
        tooltip="Percentual da margem de contribuição sobre a receita líquida no período."
        icon="margin"
        valueClassName={dsValueTone(kpis.margem_media)}
        href={drill("dre")}
        {...comparisonProps(comparisons, "margem_media", formatPercent, vsLabel)}
      />
      <DashboardKpiCard
        title="Saldo bancário"
        value={formatCurrency(kpis.saldo_bancario)}
        hint="Fluxo de Caixa · soma saldo_atual das contas ativas"
        tooltip="Saldo consolidado das contas bancárias ativas, respeitando filtros de conta quando aplicados."
        icon="cash"
        valueClassName={dsValueTone(kpis.saldo_bancario)}
        href={drill("fluxo")}
      />
      <DashboardKpiCard
        title="Contas a receber"
        value={formatCurrency(kpis.contas_receber_aberto)}
        hint="Contas a Receber · total em aberto (não vencido)"
        tooltip="Valor total de títulos a receber em aberto. Clique para abrir o módulo com filtros do período."
        icon="receivables"
        valueClassName={dsValueTone(kpis.contas_receber_aberto)}
        href={drill("contas-receber")}
        {...comparisonProps(
          comparisons,
          "contas_receber_aberto",
          formatCurrency,
          `variação por vencimentos no período · ${vsLabel}`,
        )}
      />
      <DashboardKpiCard
        title="Contas a pagar"
        value={formatCurrency(kpis.contas_pagar_aberto)}
        hint="Contas a Pagar · total em aberto (inclui parciais)"
        tooltip="Valor total de títulos a pagar em aberto, incluindo pagamentos parciais."
        icon="payables"
        href={drill("contas-pagar")}
        {...comparisonProps(
          comparisons,
          "contas_pagar_aberto",
          formatCurrency,
          `variação por vencimentos no período · ${vsLabel}`,
        )}
      />
      <DashboardKpiCard
        title="Entradas previstas"
        value={formatCurrency(kpis.entradas_previstas)}
        hint="Fluxo de Caixa · CR em aberto com vencimento no período"
        tooltip="Recebimentos previstos com base em títulos em aberto que vencem no período selecionado."
        icon="inflow"
        valueClassName={dsValueTone(kpis.entradas_previstas)}
        href={drill("fluxo-previsto-entrada")}
      />
      <DashboardKpiCard
        title="Saídas previstas"
        value={formatCurrency(kpis.saidas_previstas)}
        hint="Fluxo de Caixa · CP em aberto/parcial com vencimento no período"
        tooltip="Pagamentos previstos com base em títulos em aberto ou parciais que vencem no período."
        icon="outflow"
        href={drill("fluxo-previsto-saida")}
      />
      <DashboardKpiCard
        title="Ticket médio"
        value={formatCurrency(kpis.ticket_medio)}
        hint="Vendas · total faturado / quantidade no período"
        tooltip="Valor médio por venda faturada no período selecionado."
        icon="ticket"
        href={drill("vendas")}
        {...comparisonProps(comparisons, "ticket_medio", formatCurrency, vsLabel)}
      />
      <DashboardKpiCard
        title="Vendas"
        value={formatNumber(kpis.quantidade_vendas)}
        hint="Vendas · faturadas por data_venda no período"
        tooltip="Quantidade de vendas faturadas registradas no período."
        icon="sales"
        href={drill("vendas")}
        {...comparisonProps(
          comparisons,
          "quantidade_vendas",
          formatNumber,
          vsLabel,
        )}
      />
      <DashboardKpiCard
        title="Clientes"
        value={formatNumber(kpis.quantidade_clientes)}
        hint="Cadastro · clientes ativos do tenant"
        tooltip="Total de clientes ativos cadastrados na empresa."
        icon="customers"
        href={drill("clientes")}
      />
    </div>
  );
}

export const DashboardSummaryCards = memo(DashboardSummaryCardsComponent);

export function DashboardSummaryCardsSkeleton() {
  return (
    <div
      className={dsGrid.kpis}
      aria-busy="true"
      aria-label="Carregando indicadores"
    >
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className={cn(dsElevation.skeleton, "h-36")} />
      ))}
    </div>
  );
}
