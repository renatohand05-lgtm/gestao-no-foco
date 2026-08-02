/**
 * Fase 28.3 — Curva ABC (puro).
 * A ≈ até 80% valor acumulado · B ≈ até 95% · C = restante
 */

export type AbcItemInput = {
  id: string;
  label: string;
  valor: number;
};

export type AbcClass = "A" | "B" | "C";

export type AbcItemResult = AbcItemInput & {
  classe: AbcClass;
  participacao: number;
  acumulado: number;
};

export function classifyAbcCurve(
  items: AbcItemInput[],
  thresholds: { a: number; b: number } = { a: 0.8, b: 0.95 },
): AbcItemResult[] {
  const positive = items
    .map((i) => ({ ...i, valor: Number(i.valor) || 0 }))
    .filter((i) => i.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const total = positive.reduce((s, i) => s + i.valor, 0);
  if (total <= 0) return [];

  let acumulado = 0;
  return positive.map((item) => {
    const before = acumulado / total;
    acumulado += item.valor;
    const share = item.valor / total;
    const acc = acumulado / total;

    let classe: AbcClass = "C";
    if (before < thresholds.a) classe = "A";
    else if (before < thresholds.b) classe = "B";

    return {
      ...item,
      classe,
      participacao: share,
      acumulado: acc,
    };
  });
}

export type ReposicaoSuggestion = {
  produtoId: string;
  label: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  estoqueMaximo: number | null;
  pontoReposicao: number;
  consumoMedio: number | null;
  leadTimeDias: number | null;
  quantidadeSugerida: number;
};

/** Sugestão nunca gera pedido automaticamente. */
export function suggestReposicao(input: {
  produtoId: string;
  label: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  estoqueMaximo?: number | null;
  pontoReposicao?: number | null;
  consumoMedio?: number | null;
  leadTimeDias?: number | null;
}): ReposicaoSuggestion | null {
  const min = Math.max(0, Number(input.estoqueMinimo) || 0);
  const atual = Math.max(0, Number(input.estoqueAtual) || 0);
  const ponto =
    input.pontoReposicao != null && Number.isFinite(input.pontoReposicao)
      ? Number(input.pontoReposicao)
      : min;
  if (atual > ponto) return null;

  const max =
    input.estoqueMaximo != null && Number.isFinite(input.estoqueMaximo)
      ? Number(input.estoqueMaximo)
      : Math.max(ponto * 2, min);
  const sugerida = Math.max(max - atual, 0);
  if (sugerida <= 0) return null;

  return {
    produtoId: input.produtoId,
    label: input.label,
    estoqueAtual: atual,
    estoqueMinimo: min,
    estoqueMaximo: input.estoqueMaximo ?? null,
    pontoReposicao: ponto,
    consumoMedio: input.consumoMedio ?? null,
    leadTimeDias: input.leadTimeDias ?? null,
    quantidadeSugerida: sugerida,
  };
}
