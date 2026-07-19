/**
 * Catálogo de sugestão de classificação DRE por nome (13.15.1 / 13.15.2).
 * Só aplica quando dre_linha/dre_detalhe estão nulos — nunca sobrescreve.
 */

import type { DreLinhaEconomica } from "@/lib/dre/dre-types";
import { DRE_LINHA_LABELS } from "@/lib/dre/dre-types";
import type { DreDetalheCodigo, DreOpexGrupo } from "@/lib/dre/dre-opex-hierarchy";
import {
  DRE_OPEX_GRUPO_LABELS,
  getDreDetalheDef,
} from "@/lib/dre/dre-opex-hierarchy";

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type DreClassificationSuggestion = {
  linha: DreLinhaEconomica;
  detalhe: DreDetalheCodigo | null;
  grupo: DreOpexGrupo | null;
  grupoLabel: string | null;
  detalheLabel: string | null;
  pathLabel: string;
  origem: "sugestao_nome";
};

type Rule = {
  patterns: RegExp[];
  linha: DreLinhaEconomica;
  detalhe?: DreDetalheCodigo;
};

const RULES: Rule[] = [
  // Locação — NUNCA investimento
  { linha: "despesas_operacionais", detalhe: "locacao_aluguel", patterns: [/\baluguel\b/, /\blocacao\b/, /\blocações\b/, /\blocacoes\b/] },
  { linha: "despesas_operacionais", detalhe: "locacao_condominio", patterns: [/\bcondominio\b/] },
  { linha: "despesas_operacionais", detalhe: "locacao_iptu", patterns: [/\biptu\b/] },
  { linha: "despesas_operacionais", detalhe: "locacao_seguro_imovel", patterns: [/\bseguro do imovel\b/, /\bseguro predial\b/] },
  { linha: "despesas_operacionais", detalhe: "locacao_equipamentos", patterns: [/\blocacao de equipamento/, /\baluguel de equipamento/] },
  { linha: "despesas_operacionais", detalhe: "locacao_veiculos", patterns: [/\blocacao de veiculo/, /\baluguel de veiculo/, /\bleasing\b/] },

  // Utilidades — NUNCA investimento
  { linha: "despesas_operacionais", detalhe: "utilidades_energia", patterns: [/\benergia\b/, /\beletricidade\b/, /\benel\b/, /\bcpfl\b/, /\blight\b/] },
  { linha: "despesas_operacionais", detalhe: "utilidades_agua", patterns: [/\bagua\b/, /\besgoto\b/, /\bsabesp\b/, /\bcae\b/] },
  { linha: "despesas_operacionais", detalhe: "utilidades_gas", patterns: [/\bgas\b/, /\bcomgas\b/] },
  { linha: "despesas_operacionais", detalhe: "utilidades_internet", patterns: [/\binternet\b/, /\bbanda larga\b/, /\bfibra\b/] },
  { linha: "despesas_operacionais", detalhe: "utilidades_telefonia", patterns: [/\btelefone\b/, /\btelefonia\b/, /\bcelular\b/] },
  { linha: "despesas_operacionais", detalhe: "utilidades_gerador", patterns: [/\bgerador\b/] },

  // Manutenção / serviços
  { linha: "despesas_operacionais", detalhe: "manutencao_predial", patterns: [/\bmanutencao predial\b/, /\bmanutencao predio\b/] },
  { linha: "despesas_operacionais", detalhe: "manutencao_equipamentos", patterns: [/\bmanutencao de equipamento/, /\bmanutencao maquina/] },
  { linha: "despesas_operacionais", detalhe: "manutencao_limpeza", patterns: [/\blimpeza\b/, /\bfaxina\b/] },
  { linha: "despesas_operacionais", detalhe: "manutencao_seguranca", patterns: [/\bseguranca\b/, /\bvigilancia\b/] },
  { linha: "despesas_operacionais", detalhe: "manutencao_pragas", patterns: [/\bpragas\b/, /\bdedetizacao\b/] },
  { linha: "despesas_operacionais", detalhe: "manutencao_terceirizados", patterns: [/\bterceiriz/] },
  { linha: "despesas_operacionais", detalhe: "manutencao_contabilidade", patterns: [/\bcontabilidade\b/, /\bcontador\b/] },
  { linha: "despesas_operacionais", detalhe: "manutencao_juridico", patterns: [/\bjuridico\b/, /\badvogad/] },
  { linha: "despesas_operacionais", detalhe: "manutencao_consultorias", patterns: [/\bconsultoria\b/] },
  { linha: "despesas_operacionais", detalhe: "manutencao_outras", patterns: [/\bmanutencao\b/] },

  // Admin
  { linha: "despesas_operacionais", detalhe: "admin_escritorio", patterns: [/\bmaterial de escritorio\b/, /\bescritorio\b/] },
  { linha: "despesas_operacionais", detalhe: "admin_copa", patterns: [/\bcopa\b/, /\bcafe\b/] },
  { linha: "despesas_operacionais", detalhe: "admin_combustivel", patterns: [/\bcombustivel\b/, /\bcombustivel admin/] },
  { linha: "despesas_operacionais", detalhe: "admin_viagens", patterns: [/\bviagem\b/, /\bviagens\b/, /\bhotel\b/] },
  { linha: "despesas_operacionais", detalhe: "admin_correios", patterns: [/\bcorreios\b/, /\bsedex\b/] },
  { linha: "despesas_operacionais", detalhe: "admin_treinamentos", patterns: [/\btreinamento\b/, /\bcapacitacao\b/] },
  { linha: "despesas_operacionais", detalhe: "admin_uniformes", patterns: [/\buniforme\b/] },

  // Tech — assinaturas/sistemas = opex, não CAPEX
  { linha: "despesas_operacionais", detalhe: "tech_software", patterns: [/\bsoftware\b/, /\bsistema\b/] },
  { linha: "despesas_operacionais", detalhe: "tech_licencas", patterns: [/\blicenca\b/, /\blicencas\b/] },
  { linha: "despesas_operacionais", detalhe: "tech_assinaturas", patterns: [/\bassinatura\b/, /\bsaas\b/] },
  { linha: "despesas_operacionais", detalhe: "tech_erp", patterns: [/\berp\b/] },
  { linha: "despesas_operacionais", detalhe: "tech_hospedagem", patterns: [/\bhospedagem\b/, /\bcloud\b/, /\baws\b/] },
  { linha: "despesas_operacionais", detalhe: "tech_servicos", patterns: [/\bti\b/, /\btecnologia\b/] },

  { linha: "despesas_operacionais", detalhe: "seguros_operacionais", patterns: [/\bseguro\b/, /\bseguros\b/] },

  // Pessoal
  { linha: "despesas_pessoal", detalhe: "pessoal_salarios", patterns: [/\bsalario\b/, /\bsalarios\b/, /\bfolha\b/] },
  { linha: "despesas_pessoal", detalhe: "pessoal_prolabore", patterns: [/\bpro labore\b/, /\bprolabore\b/] },
  { linha: "despesas_pessoal", detalhe: "pessoal_encargos", patterns: [/\bencargos\b/, /\bfgts\b/, /\binss\b/] },
  { linha: "despesas_pessoal", detalhe: "pessoal_ferias", patterns: [/\bferias\b/] },
  { linha: "despesas_pessoal", detalhe: "pessoal_13", patterns: [/\b13o\b/, /\bdecimo terceiro\b/] },
  { linha: "despesas_pessoal", detalhe: "pessoal_beneficios", patterns: [/\bbeneficios\b/, /\bvale transporte\b/, /\bvale alimentacao\b/, /\bplano de saude\b/] },
  { linha: "despesas_pessoal", detalhe: "pessoal_horas_extras", patterns: [/\bhoras extras\b/] },
  { linha: "despesas_pessoal", detalhe: "pessoal_bonus", patterns: [/\bbonus\b/, /\bpremiacoes\b/] },
  { linha: "despesas_pessoal", detalhe: "pessoal_outros", patterns: [/\bterceiros?\b/, /\bmao de obra indireta\b/] },

  // Comercial
  { linha: "despesas_comerciais", detalhe: "comercial_marketing", patterns: [/\bmarketing\b/] },
  { linha: "despesas_comerciais", detalhe: "comercial_anuncios", patterns: [/\banuncio\b/, /\banuncios\b/] },
  { linha: "despesas_comerciais", detalhe: "comercial_comissoes", patterns: [/\bcomissao comercial\b/, /\bcomissoes comerciais\b/] },

  // CMV / custo direto (configurável — só quando nome deixa isso explícito)
  { linha: "cmv", detalhe: "cmv_mao_obra_direta", patterns: [/\bmao de obra direta\b/, /\bcsp\b/] },
  { linha: "cmv", detalhe: "cmv_materiais", patterns: [/\bcmv\b/, /\bpecas?\b/, /\bmateria prima\b/, /\binsumos?\b/, /\bembalagem\b/, /\bfrete\b/, /\bmercadorias?\b/] },

  { linha: "despesas_financeiras", patterns: [/\btarifa bancaria\b/, /\bjuro\b/, /\bjuros\b/, /\biof\b/, /\bmulta financeira\b/] },
  { linha: "receitas_financeiras", patterns: [/\brendimento\b/, /\brendimentos\b/] },
  { linha: "depreciacao_amortizacao", patterns: [/\bdepreciacao\b/, /\bamortizacao\b/] },
  { linha: "receita_bruta", patterns: [/\bvenda de produto\b/, /\bvenda de servico\b/, /\bfaturamento\b/, /\breceita bruta\b/] },
  { linha: "deducoes", patterns: [/\bimposto sobre venda\b/, /\bdevolucao\b/, /\bcancelamento\b/, /\bdesconto\b/] },
  { linha: "impostos_lucro", patterns: [/\birpj\b/, /\bcsll\b/, /\bimposto sobre lucro\b/] },
];

function toSuggestion(rule: Rule): DreClassificationSuggestion {
  const def = rule.detalhe ? getDreDetalheDef(rule.detalhe) : null;
  const grupo = def?.grupo ?? null;
  const pathLabel = def?.grupo
    ? `Despesas operacionais > ${DRE_OPEX_GRUPO_LABELS[def.grupo]} > ${def.label}`
    : def
      ? `${DRE_LINHA_LABELS[def.linha]} > ${def.label}`
      : DRE_LINHA_LABELS[rule.linha];

  return {
    linha: rule.linha,
    detalhe: rule.detalhe ?? null,
    grupo,
    grupoLabel: grupo ? DRE_OPEX_GRUPO_LABELS[grupo] : null,
    detalheLabel: def?.label ?? null,
    pathLabel,
    origem: "sugestao_nome",
  };
}

export function suggestDreClassificationFromName(
  name: string | null | undefined,
): DreClassificationSuggestion | null {
  if (!name?.trim()) return null;
  const blob = normalizeName(name);
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(blob))) return toSuggestion(rule);
  }
  return null;
}

/** Compat 13.15.1 */
export function suggestDreLinhaFromName(
  name: string | null | undefined,
): DreLinhaEconomica | null {
  return suggestDreClassificationFromName(name)?.linha ?? null;
}
