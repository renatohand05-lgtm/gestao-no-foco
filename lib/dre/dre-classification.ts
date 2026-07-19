/**
 * Classificação econômica — plano/categoria → linha DRE.
 * Sem inventar valores. Sem fallback silencioso para linha errada (13.15.1).
 */

import type { DreLinhaEconomica } from "@/lib/dre/dre-types";

const ALLOWED = new Set<string>([
  "receita_bruta",
  "deducoes",
  "cmv",
  "despesas_pessoal",
  "despesas_operacionais",
  "despesas_comerciais",
  "depreciacao_amortizacao",
  "receitas_financeiras",
  "despesas_financeiras",
  "impostos_lucro",
]);

export function parseDreLinha(
  value: string | null | undefined,
): DreLinhaEconomica | null {
  if (!value) return null;
  return ALLOWED.has(value) ? (value as DreLinhaEconomica) : null;
}

/**
 * Resolve linha explícita:
 * 1) plano.dre_linha
 * 2) categoria.dre_linha
 * 3) null → pendente (não inventa opex/receita)
 *
 * Juros/multa do título usam linhas financeiras.
 */
export function resolveDreLinha(input: {
  planoDreLinha?: string | null;
  categoriaDreLinha?: string | null;
  planoTipo?: string | null;
  categoriaTipo?: string | null;
  isFinanceCharge?: boolean;
}): DreLinhaEconomica | null {
  if (input.isFinanceCharge) {
    const tipo = input.planoTipo ?? input.categoriaTipo;
    if (tipo === "receita") return "receitas_financeiras";
    return "despesas_financeiras";
  }

  const fromPlano = parseDreLinha(input.planoDreLinha);
  if (fromPlano) return fromPlano;

  const fromCategoria = parseDreLinha(input.categoriaDreLinha);
  if (fromCategoria) return fromCategoria;

  return null;
}

/** Tipo receita/despesa apenas para validação de natureza — não define linha DRE. */
export function resolveTipoNatureza(input: {
  planoTipo?: string | null;
  categoriaTipo?: string | null;
}): "receita" | "despesa" | null {
  if (input.planoTipo === "receita" || input.planoTipo === "despesa") {
    return input.planoTipo;
  }
  if (
    input.categoriaTipo === "receita" ||
    input.categoriaTipo === "despesa"
  ) {
    return input.categoriaTipo;
  }
  if (input.categoriaTipo === "ambos") return "despesa";
  return null;
}
