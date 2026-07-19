/** Moeda BRL — saída idêntica em financeiro, vendas e produtos. */

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
