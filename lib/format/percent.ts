/**
 * Percentuais compartilhados.
 *
 * `formatPercent` — valor em pontos percentuais (12.5 → "12,5%").
 * Usado no Dashboard e Produtos. Saída verificada idêntica entre os dois.
 *
 * `formatPercentTaxa` — taxa financeira com 2–4 casas via style percent
 * (12.5 → "12,50%"). Usado em Formas de Pagamento / financeiro.
 * Mantido separado: arredondamento diferente de `formatPercent`.
 */

export function formatPercent(
  value: number | null | undefined,
  digits = 1,
) {
  if (value === null || value === undefined) return "—";

  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}%`;
}

export function formatPercentTaxa(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value / 100);
}
