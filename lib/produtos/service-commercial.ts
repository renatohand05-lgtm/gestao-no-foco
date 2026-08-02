/** Formatação local — evita path-alias nos testes Node. */
function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Margem sobre preço: (preço - custo) / preço. Preço zero → null. */
export function calcServiceMarginOnPrice(
  custo: number | null | undefined,
  precoAtual: number | null | undefined,
): number | null {
  if (precoAtual == null || !Number.isFinite(precoAtual) || precoAtual <= 0) {
    return null;
  }
  const c = custo == null || !Number.isFinite(custo) ? 0 : custo;
  return (precoAtual - c) / precoAtual;
}

export function formatServiceMargin(
  custo: number | null | undefined,
  precoAtual: number | null | undefined,
): string {
  const m = calcServiceMarginOnPrice(custo, precoAtual);
  if (m == null) return "Indisponível";
  return `${(m * 100).toFixed(1).replace(".", ",")}%`;
}

export function formatTempoEstimado(
  minutos: number | null | undefined,
): string {
  if (minutos == null || !Number.isFinite(minutos)) return "—";
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export type CatalogItemLabelInput = {
  id: string;
  nome: string;
  tipo?: string | null;
  sku?: string | null;
  codigo_interno?: string | null;
  preco_venda?: number | null;
  custo?: number | null;
  preco_sugerido?: number | null;
  tempo_estimado_minutos?: number | null;
  estoque_atual?: number | null;
};

/** Label rico para seletor — nunca UUID. */
export function buildCatalogItemSelectLabel(item: CatalogItemLabelInput): string {
  const isServico =
    item.tipo === "servico" || item.tipo === "serviço";
  const code = item.codigo_interno || item.sku;
  const badge = isServico ? "SERVIÇO" : "PRODUTO";
  const parts = [`${badge} · ${item.nome}`];
  if (code) parts.push(`Código ${code}`);
  if (isServico) {
    if (item.preco_venda != null) {
      parts.push(`Preço ${formatCurrency(item.preco_venda)}`);
    }
    if (item.custo != null) {
      parts.push(`Custo ${formatCurrency(item.custo)}`);
    }
    if (item.preco_sugerido != null) {
      parts.push(`Sugerido ${formatCurrency(item.preco_sugerido)}`);
    }
    if (item.tempo_estimado_minutos != null) {
      parts.push(formatTempoEstimado(item.tempo_estimado_minutos));
    }
  } else {
    if (item.preco_venda != null) {
      parts.push(formatCurrency(item.preco_venda));
    }
    if (item.estoque_atual != null) {
      parts.push(`Est. ${item.estoque_atual}`);
    }
  }
  return parts.join(" · ");
}
