import { META_DIA_STATUS_LABEL } from "./faturamento-agregacao";
import { formatCurrency, formatPercent } from "./format";
import type { ResumoVendasMesData } from "./resumo-vendas-mes-service";
import type { DashboardHojeSnapshot } from "./vendas-dia-service";

export type FooterSmartItem = {
  kind: "acao" | "risco" | "oportunidade";
  title: string;
  detail?: string;
};

/**
 * Itens do rodapé executivo — mesma fonte dos KPIs / tabela.
 * Separa claramente desempenho de hoje vs acumulado do mês.
 */
export function buildFooterExecutiveItems(input: {
  hoje: DashboardHojeSnapshot;
  resumo: ResumoVendasMesData;
}): FooterSmartItem[] {
  const items: FooterSmartItem[] = [];
  const h = input.hoje.hoje;
  const total = input.resumo.total;
  const metaHoje = h.meta;
  const realizadoHoje = h.faturamento;
  const diffHoje = metaHoje == null ? null : realizadoHoje - metaHoje;

  // —— Desempenho de hoje ——
  if (metaHoje == null || metaHoje <= 0) {
    items.push({
      kind: "acao",
      title: "Desempenho de hoje",
      detail:
        realizadoHoje > 0
          ? `Realizado de hoje ${formatCurrency(realizadoHoje)} · sem meta diária definida.`
          : "Sem meta diária e sem vendas faturadas hoje.",
    });
  } else if (diffHoje != null && diffHoje >= 0) {
    items.push({
      kind: "oportunidade",
      title: "Desempenho de hoje",
      detail: `Meta do dia superada em ${formatCurrency(diffHoje)}${
        h.percentual != null
          ? ` · atingimento ${formatPercent(h.percentual)}`
          : ""
      }.`,
    });
  } else if (diffHoje != null) {
    items.push({
      kind: "acao",
      title: "Desempenho de hoje",
      detail: `Resultado de hoje abaixo da meta · faltam ${formatCurrency(
        Math.abs(diffHoje),
      )}${
        h.percentual != null
          ? ` · atingimento ${formatPercent(h.percentual)}`
          : ""
      }.`,
    });
  }

  // —— Desempenho acumulado do mês ——
  const metaMes = input.resumo.meta_mensal;
  const realizadoMes = total.realizado_acumulado;
  const diffMes = total.diferenca;

  if (metaMes == null || metaMes <= 0) {
    items.push({
      kind: "acao",
      title: "Desempenho acumulado do mês",
      detail: `Acumulado ${formatCurrency(realizadoMes)} · sem meta mensal.`,
    });
  } else if (diffMes != null && diffMes >= 0) {
    items.push({
      kind: "oportunidade",
      title: "Desempenho acumulado do mês",
      detail: `Ritmo mensal acima da meta · acumulado ${formatCurrency(
        realizadoMes,
      )} (+${formatCurrency(diffMes)}).`,
    });
  } else if (diffMes != null) {
    items.push({
      kind: "risco",
      title: "Desempenho acumulado do mês",
      detail: `Ritmo mensal abaixo da meta · acumulado ${formatCurrency(
        realizadoMes,
      )} (−${formatCurrency(Math.abs(diffMes))})${
        total.pct_diferenca != null
          ? ` · ${formatPercent(total.pct_diferenca)}`
          : ""
      }.`,
    });
  }

  const diasDecorridos = input.resumo.rows.filter((r) => r.kind !== "futuro")
    .length;
  const diasTotais = input.resumo.rows.length;
  if (metaMes != null && metaMes > 0 && diasDecorridos > 0 && diasTotais > 0) {
    const ritmo = (realizadoMes / diasDecorridos) * diasTotais;
    const gapProjecao = ritmo - metaMes;
    items.push({
      kind: gapProjecao >= 0 ? "oportunidade" : "risco",
      title: "Projeção do mês",
      detail:
        gapProjecao >= 0
          ? `Projeção de fechamento ${formatCurrency(ritmo)} · acima da meta mensal.`
          : `Projeção de fechamento ${formatCurrency(ritmo)} · gap de ${formatCurrency(
              Math.abs(gapProjecao),
            )} vs meta mensal.`,
    });
  }

  return items.slice(0, 6);
}

export function footerStatusLabelFromHoje(
  hoje: DashboardHojeSnapshot,
): string {
  const label = META_DIA_STATUS_LABEL[hoje.hoje.status];
  if (hoje.hoje.status === "superada" || hoje.hoje.status === "atingida") {
    return `Hoje · Meta ${label.toLowerCase()}`;
  }
  if (hoje.hoje.status === "sem_meta") {
    return "Hoje · Sem meta diária";
  }
  return `Hoje · Meta ${label.toLowerCase()}`;
}
