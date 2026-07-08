import type { ProdutoTipo } from "@/types/produtos";

export function formatProdutoDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

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
