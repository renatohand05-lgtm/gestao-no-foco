import type { ProdutoTipo } from "@/types/produtos";

export { formatCurrency, formatPercent, formatQuantity } from "@/lib/format";
export { formatDateTime as formatProdutoDate } from "@/lib/format";

export function getTipoLabel(tipo: ProdutoTipo) {
  const labels: Record<ProdutoTipo, string> = {
    produto: "Produto",
    servico: "Serviço",
    kit: "Kit",
    combo: "Combo",
    materia_prima: "Matéria-prima",
  };

  return labels[tipo];
}

export function calcMargemPercent(
  custo: number | null | undefined,
  precoVenda: number | null | undefined,
) {
  if (!custo || custo <= 0 || precoVenda === null || precoVenda === undefined) {
    return null;
  }

  return Number((((precoVenda - custo) / custo) * 100).toFixed(2));
}

export function parseNumericInput(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toNumericInputValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}
