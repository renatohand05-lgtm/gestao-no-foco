/** Moeda BRL — saída idêntica em financeiro, vendas e produtos. */

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Moeda compacta para KPIs/painéis estreitos — só quando necessário.
 * Sem inventar: mesma base numérica, só formatação.
 */
export function formatCurrencyCompact(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (abs >= 10_000) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return formatCurrency(value);
}

/**
 * Label de gráfico — compacto executivo (Sprint 25.6.3).
 * Exemplos: R$ 950 · R$ 1,4 mil · R$ 14,3 mil · R$ 125 mil · R$ 1,2 mi
 */
export function formatCurrencyChartLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    const mi = abs / 1_000_000;
    const text =
      mi >= 10
        ? mi.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
        : mi.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          });
    return `${sign}R$ ${text} mi`;
  }

  if (abs >= 1000) {
    const mil = abs / 1000;
    const text =
      mil >= 100
        ? mil.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
        : mil.toLocaleString("pt-BR", {
            minimumFractionDigits: mil >= 10 ? 1 : 1,
            maximumFractionDigits: 1,
          });
    return `${sign}R$ ${text} mil`;
  }

  return `${sign}R$ ${Math.round(abs).toLocaleString("pt-BR")}`;
}
