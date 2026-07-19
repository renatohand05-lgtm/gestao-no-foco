import type { DreDrillItem, DreFilters, DreResumo } from "@/types/dre";
import type { FluxoCaixaResumo } from "@/types/fluxo-caixa";
import type { FiExpenseRow, FiInsight, FiRankItem } from "@/lib/financial-intelligence/types";

function dreHref(tenantSlug: string, filters: DreFilters, linha?: string) {
  const params = new URLSearchParams({
    dataDe: filters.dataDe,
    dataAte: filters.dataAte,
  });
  if (filters.centroCustoId) params.set("centroCusto", filters.centroCustoId);
  if (filters.categoriaId) params.set("categoria", filters.categoriaId);
  if (linha) params.set("linha", linha);
  return `/${tenantSlug}/financeiro/dre?${params}`;
}

function fluxoHref(tenantSlug: string, filters: DreFilters) {
  const params = new URLSearchParams({
    dataDe: filters.dataDe,
    dataAte: filters.dataAte,
  });
  return `/${tenantSlug}/financeiro/fluxo-caixa?${params}`;
}

export function buildDeterministicInsights(input: {
  tenantSlug: string;
  filters: DreFilters;
  resumo: DreResumo;
  previous: DreResumo;
  fluxo: FluxoCaixaResumo;
  expenses: FiExpenseRow[];
  drillItems: DreDrillItem[];
  topClientes: FiRankItem[];
  topCentros: FiRankItem[];
}): FiInsight[] {
  const {
    tenantSlug,
    filters,
    resumo,
    previous,
    fluxo,
    expenses,
    drillItems,
    topClientes,
    topCentros,
  } = input;

  const insights: FiInsight[] = [];
  const rl = resumo.receita_liquida;

  const topExpense = [...expenses]
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)[0];
  if (topExpense) {
    insights.push({
      id: "maior-despesa",
      title: "Maior despesa do período",
      detail: `${topExpense.label}: ${formatMoney(topExpense.value)}${
        topExpense.pctReceitaLiquida != null
          ? ` (${topExpense.pctReceitaLiquida.toFixed(1)}% da receita líquida)`
          : ""
      }.`,
      severity: "info",
      href: topExpense.href,
    });
  }

  const byFornecedor = new Map<string, number>();
  for (const item of drillItems) {
    if (!item.fornecedorNome) continue;
    if (
      item.linha !== "despesas_operacionais" &&
      item.linha !== "despesas_pessoal" &&
      item.linha !== "despesas_comerciais" &&
      item.linha !== "cmv"
    ) {
      continue;
    }
    byFornecedor.set(
      item.fornecedorNome,
      (byFornecedor.get(item.fornecedorNome) ?? 0) + Math.abs(item.valor),
    );
  }
  const topForn = [...byFornecedor.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topForn) {
    insights.push({
      id: "maior-fornecedor",
      title: "Maior fornecedor (despesas no DRE)",
      detail: `${topForn[0]} concentra ${formatMoney(topForn[1])} em lançamentos do período.`,
      severity: "info",
      href: `/${tenantSlug}/financeiro/contas-pagar?dataDe=${filters.dataDe}&dataAte=${filters.dataAte}`,
    });
  }

  const topCentro = topCentros[0];
  if (topCentro) {
    insights.push({
      id: "maior-centro",
      title: "Maior centro de custo (receita)",
      detail: `${topCentro.label}: ${formatMoney(topCentro.value)} no ranking do período.`,
      severity: "info",
      href: dreHref(tenantSlug, {
        ...filters,
        centroCustoId: topCentro.id,
      }),
    });
  }

  // Crescimento/redução de categorias opex via comparação period totals of opex lines
  const opexNow = resumo.despesas_operacionais;
  const opexPrev = previous.despesas_operacionais;
  if (opexPrev > 0) {
    const deltaPct = ((opexNow - opexPrev) / opexPrev) * 100;
    if (deltaPct >= 8) {
      insights.push({
        id: "opex-cresceu",
        title: "Despesas operacionais em alta",
        detail: `OPEX consolidado cresceu ${deltaPct.toFixed(1)}% vs período anterior.`,
        severity: "warning",
        href: dreHref(tenantSlug, filters, "despesas_operacionais"),
      });
    } else if (deltaPct <= -8) {
      insights.push({
        id: "opex-reduziu",
        title: "Despesas operacionais em queda",
        detail: `OPEX consolidado reduziu ${Math.abs(deltaPct).toFixed(1)}% vs período anterior.`,
        severity: "positive",
        href: dreHref(tenantSlug, filters, "despesas_operacionais"),
      });
    }
  }

  const ebitdaPct = rl > 0 ? (resumo.ebitda / rl) * 100 : null;
  if (ebitdaPct != null && ebitdaPct < 5) {
    insights.push({
      id: "alerta-ebitda",
      title: "Alerta de EBITDA",
      detail: `Margem EBITDA em ${ebitdaPct.toFixed(1)}% da receita líquida (abaixo de 5%).`,
      severity: ebitdaPct < 0 ? "critical" : "warning",
      href: dreHref(tenantSlug, filters),
    });
  }

  if (fluxo.saldo_atual < 0 || fluxo.saldo_projetado < 0) {
    insights.push({
      id: "alerta-caixa",
      title: "Alerta de caixa",
      detail: `Saldo atual ${formatMoney(fluxo.saldo_atual)}; projetado ${formatMoney(fluxo.saldo_projetado)}.`,
      severity: "critical",
      href: fluxoHref(tenantSlug, filters),
    });
  } else if (fluxo.saidas_previstas > fluxo.entradas_previstas * 1.2) {
    insights.push({
      id: "alerta-caixa-previsto",
      title: "Pressão de caixa prevista",
      detail: `Saídas previstas (${formatMoney(fluxo.saidas_previstas)}) superam entradas previstas em >20%.`,
      severity: "warning",
      href: fluxoHref(tenantSlug, filters),
    });
  }

  const margemBruta = rl > 0 ? (resumo.margem_contribuicao / rl) * 100 : null;
  if (margemBruta != null && margemBruta < 20) {
    insights.push({
      id: "alerta-margem",
      title: "Alerta de margem",
      detail: `Margem bruta (contribuição) em ${margemBruta.toFixed(1)}% — abaixo do limiar determinístico de 20%.`,
      severity: "warning",
      href: dreHref(tenantSlug, filters),
    });
  }

  const topCliente = topClientes[0];
  if (topCliente) {
    insights.push({
      id: "top-cliente",
      title: "Cliente de maior receita",
      detail: `${topCliente.label}: ${formatMoney(topCliente.value)} em vendas faturadas no período.`,
      severity: "info",
      href: `/${tenantSlug}/clientes`,
    });
  }

  return insights.slice(0, 10);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
