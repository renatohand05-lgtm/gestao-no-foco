/**
 * Composição determinística do DRE a partir de lançamentos classificados.
 * Pagamento/caixa NÃO entra aqui.
 */

import { DRE_LINHA_LABELS, type DreLedgerEntry, type DreTotals } from "@/lib/dre/dre-types";
import type { DreLinha, DreResumo } from "@/types/dre";

export function emptyDreTotals(): DreTotals {
  return {
    receita_bruta: 0,
    deducoes: 0,
    receita_liquida: 0,
    cmv: 0,
    margem_contribuicao: 0,
    despesas_pessoal: 0,
    despesas_operacionais: 0,
    despesas_comerciais: 0,
    despesas_opex_total: 0,
    ebitda: 0,
    depreciacao_amortizacao: 0,
    ebit: 0,
    receitas_financeiras: 0,
    despesas_financeiras: 0,
    resultado_antes_impostos: 0,
    impostos_lucro: 0,
    resultado_final: 0,
  };
}

export function composeDreTotals(entries: DreLedgerEntry[]): DreTotals {
  const t = emptyDreTotals();

  for (const e of entries) {
    const v = Number(e.valor) || 0;
    switch (e.linha) {
      case "receita_bruta":
        t.receita_bruta += v;
        break;
      case "deducoes":
        t.deducoes += v;
        break;
      case "cmv":
        t.cmv += v;
        break;
      case "despesas_pessoal":
        t.despesas_pessoal += v;
        break;
      case "despesas_operacionais":
        t.despesas_operacionais += v;
        break;
      case "despesas_comerciais":
        t.despesas_comerciais += v;
        break;
      case "depreciacao_amortizacao":
        t.depreciacao_amortizacao += v;
        break;
      case "receitas_financeiras":
        t.receitas_financeiras += v;
        break;
      case "despesas_financeiras":
        t.despesas_financeiras += v;
        break;
      case "impostos_lucro":
        t.impostos_lucro += v;
        break;
    }
  }

  t.receita_liquida = t.receita_bruta - t.deducoes;
  t.margem_contribuicao = t.receita_liquida - t.cmv;
  t.despesas_opex_total =
    t.despesas_pessoal + t.despesas_operacionais + t.despesas_comerciais;
  t.ebitda = t.margem_contribuicao - t.despesas_opex_total;
  t.ebit = t.ebitda - t.depreciacao_amortizacao;
  t.resultado_antes_impostos =
    t.ebit - t.despesas_financeiras + t.receitas_financeiras;
  t.resultado_final = t.resultado_antes_impostos - t.impostos_lucro;

  return t;
}

/** Mantém contrato do Dashboard (`despesas_operacionais` = opex total). */
export function toDreResumo(totals: DreTotals): DreResumo {
  return {
    receita_bruta: totals.receita_bruta,
    deducoes: totals.deducoes,
    receita_liquida: totals.receita_liquida,
    cmv: totals.cmv,
    margem_contribuicao: totals.margem_contribuicao,
    despesas_operacionais: totals.despesas_opex_total,
    ebitda: totals.ebitda,
    receitas_financeiras: totals.receitas_financeiras,
    despesas_financeiras: totals.despesas_financeiras,
    resultado_final: totals.resultado_final,
    despesas_pessoal: totals.despesas_pessoal,
    despesas_comerciais: totals.despesas_comerciais,
    despesas_operacionais_adm: totals.despesas_operacionais,
    depreciacao_amortizacao: totals.depreciacao_amortizacao,
    ebit: totals.ebit,
    impostos_lucro: totals.impostos_lucro,
    resultado_antes_impostos: totals.resultado_antes_impostos,
  };
}

export function buildDreStatementLines(totals: DreTotals): DreLinha[] {
  return [
    {
      codigo: "receita_bruta",
      label: DRE_LINHA_LABELS.receita_bruta,
      valor: totals.receita_bruta,
      drillable: true,
      dreLinha: "receita_bruta",
    },
    {
      codigo: "deducoes",
      label: `(-) ${DRE_LINHA_LABELS.deducoes}`,
      valor: totals.deducoes,
      drillable: true,
      dreLinha: "deducoes",
    },
    {
      codigo: "receita_liquida",
      label: "Receita líquida",
      valor: totals.receita_liquida,
      destaque: true,
    },
    {
      codigo: "cmv",
      label: `(-) ${DRE_LINHA_LABELS.cmv}`,
      valor: totals.cmv,
      drillable: true,
      dreLinha: "cmv",
    },
    {
      codigo: "margem_contribuicao",
      label: "Margem de contribuição",
      valor: totals.margem_contribuicao,
      destaque: true,
    },
    {
      codigo: "despesas_pessoal",
      label: `(-) ${DRE_LINHA_LABELS.despesas_pessoal}`,
      valor: totals.despesas_pessoal,
      drillable: true,
      dreLinha: "despesas_pessoal",
    },
    {
      codigo: "despesas_operacionais_adm",
      label: `(-) ${DRE_LINHA_LABELS.despesas_operacionais}`,
      valor: totals.despesas_operacionais,
      drillable: true,
      dreLinha: "despesas_operacionais",
    },
    {
      codigo: "despesas_comerciais",
      label: `(-) ${DRE_LINHA_LABELS.despesas_comerciais}`,
      valor: totals.despesas_comerciais,
      drillable: true,
      dreLinha: "despesas_comerciais",
    },
    {
      codigo: "ebitda",
      label: "EBITDA",
      valor: totals.ebitda,
      destaque: true,
    },
    {
      codigo: "depreciacao_amortizacao",
      label: `(-) ${DRE_LINHA_LABELS.depreciacao_amortizacao}`,
      valor: totals.depreciacao_amortizacao,
      drillable: true,
      dreLinha: "depreciacao_amortizacao",
    },
    {
      codigo: "ebit",
      label: "EBIT",
      valor: totals.ebit,
      destaque: true,
    },
    {
      codigo: "receitas_financeiras",
      label: `(+) ${DRE_LINHA_LABELS.receitas_financeiras}`,
      valor: totals.receitas_financeiras,
      drillable: true,
      dreLinha: "receitas_financeiras",
    },
    {
      codigo: "despesas_financeiras",
      label: `(-) ${DRE_LINHA_LABELS.despesas_financeiras}`,
      valor: totals.despesas_financeiras,
      drillable: true,
      dreLinha: "despesas_financeiras",
    },
    {
      codigo: "resultado_antes_impostos",
      label: "Resultado antes dos impostos",
      valor: totals.resultado_antes_impostos,
      destaque: true,
    },
    {
      codigo: "impostos_lucro",
      label: `(-) ${DRE_LINHA_LABELS.impostos_lucro}`,
      valor: totals.impostos_lucro,
      drillable: true,
      dreLinha: "impostos_lucro",
    },
    {
      codigo: "resultado_final",
      label: "Resultado líquido",
      valor: totals.resultado_final,
      destaque: true,
    },
  ];
}

export function filterEntriesByLinha(
  entries: DreLedgerEntry[],
  linha: string,
  detalhe?: string | null,
): DreLedgerEntry[] {
  return entries.filter((e) => {
    if (e.linha !== linha) return false;
    if (detalhe == null || detalhe === "") return true;
    if (detalhe === "__none__") return !e.detalhe;
    return e.detalhe === detalhe;
  });
}
