/**
 * Fase 28.6 — Orçado × realizado (puro).
 * Semântica por natureza: receita (positivo = favorável se realizado > orçado);
 * custo/despesa (positivo gap = desfavorável se realizado > orçado).
 */

export type BudgetNatureza =
  | "receita"
  | "custo"
  | "despesa"
  | "investimento"
  | "divida"
  | "caixa";

export type BudgetVarianceLine = {
  id: string;
  label: string;
  natureza: BudgetNatureza;
  orcado: number;
  realizado: number;
};

export type BudgetVarianceResult = BudgetVarianceLine & {
  diferenca: number;
  variacaoPct: number | null;
  favoravel: boolean | null;
};

export function computeBudgetVariance(
  line: BudgetVarianceLine,
): BudgetVarianceResult {
  const orcado = Number(line.orcado) || 0;
  const realizado = Number(line.realizado) || 0;
  const diferenca = realizado - orcado;
  const variacaoPct =
    orcado === 0 ? null : (diferenca / Math.abs(orcado)) * 100;

  let favoravel: boolean | null = null;
  if (orcado !== 0 || realizado !== 0) {
    if (line.natureza === "receita" || line.natureza === "caixa") {
      favoravel = diferenca >= 0;
    } else {
      favoravel = diferenca <= 0;
    }
  }

  return {
    ...line,
    orcado,
    realizado,
    diferenca,
    variacaoPct,
    favoravel,
  };
}

export function summarizeBudgetVariance(lines: BudgetVarianceResult[]): {
  orcado: number;
  realizado: number;
  diferenca: number;
  linhasFavoraveis: number;
  linhasDesfavoraveis: number;
} {
  return {
    orcado: lines.reduce((s, l) => s + l.orcado, 0),
    realizado: lines.reduce((s, l) => s + l.realizado, 0),
    diferenca: lines.reduce((s, l) => s + l.diferenca, 0),
    linhasFavoraveis: lines.filter((l) => l.favoravel === true).length,
    linhasDesfavoraveis: lines.filter((l) => l.favoravel === false).length,
  };
}
