import type { MovimentacaoTipo } from "@/types/estoque";

export function formatMovimentacaoDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
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

export function getMovimentacaoTipoLabel(tipo: MovimentacaoTipo) {
  const labels: Record<MovimentacaoTipo, string> = {
    entrada: "Entrada",
    saida: "Saída",
    ajuste: "Ajuste manual",
  };

  return labels[tipo];
}

export function getOrigemLabel(origem: string) {
  const labels: Record<string, string> = {
    manual: "Manual",
    compra: "Compra",
    venda: "Venda",
    devolucao: "Devolução",
    inventario: "Inventário",
    outro: "Outro",
  };

  return labels[origem] ?? origem;
}

export function getQuantidadeLabel(tipo: MovimentacaoTipo) {
  if (tipo === "ajuste") return "Nova quantidade";
  return "Quantidade";
}

export function isEstoqueBaixo(
  estoqueAtual: number,
  estoqueMinimo: number | null | undefined,
) {
  if (estoqueMinimo === null || estoqueMinimo === undefined) return false;
  return estoqueAtual < estoqueMinimo;
}
