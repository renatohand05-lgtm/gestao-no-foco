import type { MovimentacaoTipo } from "@/types/estoque";

export { formatQuantity } from "@/lib/format";
export { formatDateTime as formatMovimentacaoDate } from "@/lib/format";

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
