/** Quantidade com até 3 casas — idêntica em produtos, vendas e estoque. */

export function formatQuantity(
  value: number | null | undefined,
  unidade?: string | null,
) {
  if (value === null || value === undefined) return "—";

  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);

  return unidade ? `${formatted} ${unidade}` : formatted;
}
