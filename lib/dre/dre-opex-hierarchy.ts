/**
 * Hierarquia gerencial do DRE (Sprint 13.15.2).
 * Não altera totais econômicos — detalhe é decomposição visual/drill.
 * Aluguel/utilidades NÃO são investimento/CAPEX.
 */

import {
  DRE_LINHA_LABELS,
  DRE_LINHA_OPTIONS,
  type DreLinhaEconomica,
} from "@/lib/dre/dre-types";

export type DreOpexGrupo =
  | "locacao_ocupacao"
  | "utilidades_infraestrutura"
  | "manutencao_servicos"
  | "despesas_administrativas"
  | "tecnologia_sistemas"
  | "seguros_taxas_operacionais"
  | "outras_despesas_operacionais";

export type DreDetalheCodigo =
  | "locacao_aluguel"
  | "locacao_condominio"
  | "locacao_iptu"
  | "locacao_seguro_imovel"
  | "locacao_equipamentos"
  | "locacao_veiculos"
  | "locacao_outras"
  | "utilidades_energia"
  | "utilidades_agua"
  | "utilidades_gas"
  | "utilidades_internet"
  | "utilidades_telefonia"
  | "utilidades_gerador"
  | "utilidades_outras"
  | "manutencao_predial"
  | "manutencao_equipamentos"
  | "manutencao_limpeza"
  | "manutencao_seguranca"
  | "manutencao_pragas"
  | "manutencao_terceirizados"
  | "manutencao_contabilidade"
  | "manutencao_juridico"
  | "manutencao_consultorias"
  | "manutencao_outras"
  | "admin_escritorio"
  | "admin_copa"
  | "admin_combustivel"
  | "admin_viagens"
  | "admin_correios"
  | "admin_treinamentos"
  | "admin_uniformes"
  | "admin_outras"
  | "tech_software"
  | "tech_licencas"
  | "tech_assinaturas"
  | "tech_erp"
  | "tech_telefonia_digital"
  | "tech_hospedagem"
  | "tech_servicos"
  | "seguros_operacionais"
  | "taxas_operacionais"
  | "opex_outras"
  | "pessoal_salarios"
  | "pessoal_prolabore"
  | "pessoal_encargos"
  | "pessoal_ferias"
  | "pessoal_13"
  | "pessoal_beneficios"
  | "pessoal_horas_extras"
  | "pessoal_bonus"
  | "pessoal_outros"
  | "comercial_marketing"
  | "comercial_anuncios"
  | "comercial_comissoes"
  | "comercial_outros"
  | "cmv_mao_obra_direta"
  | "cmv_materiais"
  | "cmv_outros";

export type DreDetalheDef = {
  codigo: DreDetalheCodigo;
  label: string;
  linha: DreLinhaEconomica;
  grupo?: DreOpexGrupo;
};

export const DRE_OPEX_GRUPO_LABELS: Record<DreOpexGrupo, string> = {
  locacao_ocupacao: "Locação e ocupação",
  utilidades_infraestrutura: "Utilidades e infraestrutura",
  manutencao_servicos: "Manutenção e serviços",
  despesas_administrativas: "Despesas administrativas",
  tecnologia_sistemas: "Tecnologia e sistemas",
  seguros_taxas_operacionais: "Seguros e taxas operacionais",
  outras_despesas_operacionais: "Outras despesas operacionais",
};

export const DRE_OPEX_GRUPO_ORDER: DreOpexGrupo[] = [
  "locacao_ocupacao",
  "utilidades_infraestrutura",
  "manutencao_servicos",
  "despesas_administrativas",
  "tecnologia_sistemas",
  "seguros_taxas_operacionais",
  "outras_despesas_operacionais",
];

export const DRE_DETALHE_DEFS: DreDetalheDef[] = [
  { codigo: "locacao_aluguel", label: "Aluguel / locação", linha: "despesas_operacionais", grupo: "locacao_ocupacao" },
  { codigo: "locacao_condominio", label: "Condomínio", linha: "despesas_operacionais", grupo: "locacao_ocupacao" },
  { codigo: "locacao_iptu", label: "IPTU", linha: "despesas_operacionais", grupo: "locacao_ocupacao" },
  { codigo: "locacao_seguro_imovel", label: "Seguro do imóvel", linha: "despesas_operacionais", grupo: "locacao_ocupacao" },
  { codigo: "locacao_equipamentos", label: "Locação de equipamentos", linha: "despesas_operacionais", grupo: "locacao_ocupacao" },
  { codigo: "locacao_veiculos", label: "Locação de veículos", linha: "despesas_operacionais", grupo: "locacao_ocupacao" },
  { codigo: "locacao_outras", label: "Outras despesas de ocupação", linha: "despesas_operacionais", grupo: "locacao_ocupacao" },
  { codigo: "utilidades_energia", label: "Energia elétrica", linha: "despesas_operacionais", grupo: "utilidades_infraestrutura" },
  { codigo: "utilidades_agua", label: "Água e esgoto", linha: "despesas_operacionais", grupo: "utilidades_infraestrutura" },
  { codigo: "utilidades_gas", label: "Gás", linha: "despesas_operacionais", grupo: "utilidades_infraestrutura" },
  { codigo: "utilidades_internet", label: "Internet", linha: "despesas_operacionais", grupo: "utilidades_infraestrutura" },
  { codigo: "utilidades_telefonia", label: "Telefonia", linha: "despesas_operacionais", grupo: "utilidades_infraestrutura" },
  { codigo: "utilidades_gerador", label: "Gerador / combustível de infraestrutura", linha: "despesas_operacionais", grupo: "utilidades_infraestrutura" },
  { codigo: "utilidades_outras", label: "Outras utilidades", linha: "despesas_operacionais", grupo: "utilidades_infraestrutura" },
  { codigo: "manutencao_predial", label: "Manutenção predial", linha: "despesas_operacionais", grupo: "manutencao_servicos" },
  { codigo: "manutencao_equipamentos", label: "Manutenção de equipamentos", linha: "despesas_operacionais", grupo: "manutencao_servicos" },
  { codigo: "manutencao_limpeza", label: "Limpeza", linha: "despesas_operacionais", grupo: "manutencao_servicos" },
  { codigo: "manutencao_seguranca", label: "Segurança", linha: "despesas_operacionais", grupo: "manutencao_servicos" },
  { codigo: "manutencao_pragas", label: "Controle de pragas", linha: "despesas_operacionais", grupo: "manutencao_servicos" },
  { codigo: "manutencao_terceirizados", label: "Serviços terceirizados", linha: "despesas_operacionais", grupo: "manutencao_servicos" },
  { codigo: "manutencao_contabilidade", label: "Contabilidade", linha: "despesas_operacionais", grupo: "manutencao_servicos" },
  { codigo: "manutencao_juridico", label: "Jurídico", linha: "despesas_operacionais", grupo: "manutencao_servicos" },
  { codigo: "manutencao_consultorias", label: "Consultorias", linha: "despesas_operacionais", grupo: "manutencao_servicos" },
  { codigo: "manutencao_outras", label: "Outras manutenções e serviços", linha: "despesas_operacionais", grupo: "manutencao_servicos" },
  { codigo: "admin_escritorio", label: "Material de escritório", linha: "despesas_operacionais", grupo: "despesas_administrativas" },
  { codigo: "admin_copa", label: "Copa e consumo interno", linha: "despesas_operacionais", grupo: "despesas_administrativas" },
  { codigo: "admin_combustivel", label: "Combustível administrativo", linha: "despesas_operacionais", grupo: "despesas_administrativas" },
  { codigo: "admin_viagens", label: "Viagens", linha: "despesas_operacionais", grupo: "despesas_administrativas" },
  { codigo: "admin_correios", label: "Correios e entregas", linha: "despesas_operacionais", grupo: "despesas_administrativas" },
  { codigo: "admin_treinamentos", label: "Treinamentos", linha: "despesas_operacionais", grupo: "despesas_administrativas" },
  { codigo: "admin_uniformes", label: "Uniformes", linha: "despesas_operacionais", grupo: "despesas_administrativas" },
  { codigo: "admin_outras", label: "Outras despesas administrativas", linha: "despesas_operacionais", grupo: "despesas_administrativas" },
  { codigo: "tech_software", label: "Software", linha: "despesas_operacionais", grupo: "tecnologia_sistemas" },
  { codigo: "tech_licencas", label: "Licenças", linha: "despesas_operacionais", grupo: "tecnologia_sistemas" },
  { codigo: "tech_assinaturas", label: "Assinaturas", linha: "despesas_operacionais", grupo: "tecnologia_sistemas" },
  { codigo: "tech_erp", label: "ERP", linha: "despesas_operacionais", grupo: "tecnologia_sistemas" },
  { codigo: "tech_telefonia_digital", label: "Telefonia digital", linha: "despesas_operacionais", grupo: "tecnologia_sistemas" },
  { codigo: "tech_hospedagem", label: "Hospedagem", linha: "despesas_operacionais", grupo: "tecnologia_sistemas" },
  { codigo: "tech_servicos", label: "Serviços de tecnologia", linha: "despesas_operacionais", grupo: "tecnologia_sistemas" },
  { codigo: "seguros_operacionais", label: "Seguros operacionais", linha: "despesas_operacionais", grupo: "seguros_taxas_operacionais" },
  { codigo: "taxas_operacionais", label: "Taxas operacionais", linha: "despesas_operacionais", grupo: "seguros_taxas_operacionais" },
  { codigo: "opex_outras", label: "Outras despesas operacionais", linha: "despesas_operacionais", grupo: "outras_despesas_operacionais" },
  { codigo: "pessoal_salarios", label: "Salários", linha: "despesas_pessoal" },
  { codigo: "pessoal_prolabore", label: "Pró-labore", linha: "despesas_pessoal" },
  { codigo: "pessoal_encargos", label: "Encargos", linha: "despesas_pessoal" },
  { codigo: "pessoal_ferias", label: "Férias", linha: "despesas_pessoal" },
  { codigo: "pessoal_13", label: "13º", linha: "despesas_pessoal" },
  { codigo: "pessoal_beneficios", label: "Benefícios", linha: "despesas_pessoal" },
  { codigo: "pessoal_horas_extras", label: "Horas extras", linha: "despesas_pessoal" },
  { codigo: "pessoal_bonus", label: "Bônus", linha: "despesas_pessoal" },
  { codigo: "pessoal_outros", label: "Outras despesas com pessoal", linha: "despesas_pessoal" },
  { codigo: "comercial_marketing", label: "Marketing", linha: "despesas_comerciais" },
  { codigo: "comercial_anuncios", label: "Anúncios", linha: "despesas_comerciais" },
  { codigo: "comercial_comissoes", label: "Comissão comercial", linha: "despesas_comerciais" },
  { codigo: "comercial_outros", label: "Outras despesas comerciais", linha: "despesas_comerciais" },
  { codigo: "cmv_mao_obra_direta", label: "Mão de obra direta (CSP)", linha: "cmv" },
  { codigo: "cmv_materiais", label: "Materiais / insumos (CMV)", linha: "cmv" },
  { codigo: "cmv_outros", label: "Outros custos diretos", linha: "cmv" },
];

const BY_CODIGO = new Map(DRE_DETALHE_DEFS.map((d) => [d.codigo, d]));

export const DRE_DETALHE_CODES = DRE_DETALHE_DEFS.map((d) => d.codigo);

export function parseDreDetalhe(
  value: string | null | undefined,
): DreDetalheCodigo | null {
  if (!value) return null;
  return BY_CODIGO.has(value as DreDetalheCodigo)
    ? (value as DreDetalheCodigo)
    : null;
}

export function getDreDetalheDef(
  codigo: string | null | undefined,
): DreDetalheDef | null {
  if (!codigo) return null;
  return BY_CODIGO.get(codigo as DreDetalheCodigo) ?? null;
}

export function formatDreHierarchyPath(
  linha: DreLinhaEconomica | null | undefined,
  detalhe: string | null | undefined,
): string {
  const def = getDreDetalheDef(detalhe);
  if (def?.grupo) {
    return `Despesas operacionais > ${DRE_OPEX_GRUPO_LABELS[def.grupo]} > ${def.label}`;
  }
  if (def) {
    return `${DRE_LINHA_LABELS[def.linha]} > ${def.label}`;
  }
  if (linha) return DRE_LINHA_LABELS[linha];
  return "Pendente de classificação";
}

export function buildDreClassificationSelectOptions(): Array<{
  value: string;
  label: string;
  linha: DreLinhaEconomica;
  detalhe: DreDetalheCodigo | "";
}> {
  const options: Array<{
    value: string;
    label: string;
    linha: DreLinhaEconomica;
    detalhe: DreDetalheCodigo | "";
  }> = [];

  for (const opt of DRE_LINHA_OPTIONS) {
    options.push({
      value: opt.value,
      label: `${opt.label} (geral)`,
      linha: opt.value,
      detalhe: "",
    });
  }

  for (const grupo of DRE_OPEX_GRUPO_ORDER) {
    for (const def of DRE_DETALHE_DEFS.filter((d) => d.grupo === grupo)) {
      options.push({
        value: `${def.linha}::${def.codigo}`,
        label: `${DRE_LINHA_LABELS[def.linha]} > ${DRE_OPEX_GRUPO_LABELS[grupo]} > ${def.label}`,
        linha: def.linha,
        detalhe: def.codigo,
      });
    }
  }

  for (const def of DRE_DETALHE_DEFS.filter((d) => !d.grupo)) {
    options.push({
      value: `${def.linha}::${def.codigo}`,
      label: `${DRE_LINHA_LABELS[def.linha]} > ${def.label}`,
      linha: def.linha,
      detalhe: def.codigo,
    });
  }

  return options;
}

export function encodeDreClassification(
  linha: string | null | undefined,
  detalhe: string | null | undefined,
): string {
  if (!linha) return "";
  if (detalhe) return `${linha}::${detalhe}`;
  return linha;
}

export function decodeDreClassification(value: string): {
  linha: string;
  detalhe: string;
} {
  if (!value) return { linha: "", detalhe: "" };
  const [linha, detalhe] = value.split("::");
  return { linha: linha ?? "", detalhe: detalhe ?? "" };
}

export type DreHierarchyNode = {
  key: string;
  label: string;
  valor: number;
  depth: number;
  drillable: boolean;
  dreLinha?: DreLinhaEconomica;
  dreDetalhe?: string;
  grupo?: DreOpexGrupo;
  children?: DreHierarchyNode[];
};

/**
 * Decompõe lançamentos de despesas_operacionais em grupos/linhas.
 * Totais econômicos NÃO são recalculados aqui.
 */
export function buildOpexHierarchyNodes(
  entries: Array<{ linha: string; valor: number; detalhe?: string | null }>,
): DreHierarchyNode[] {
  const opex = entries.filter((e) => e.linha === "despesas_operacionais");
  const byGrupo = new Map<DreOpexGrupo, Map<string, number>>();
  let semDetalhe = 0;

  for (const e of opex) {
    const v = Number(e.valor) || 0;
    const def = getDreDetalheDef(e.detalhe);
    if (!def?.grupo) {
      semDetalhe += v;
      continue;
    }
    if (!byGrupo.has(def.grupo)) byGrupo.set(def.grupo, new Map());
    const map = byGrupo.get(def.grupo)!;
    map.set(def.codigo, (map.get(def.codigo) ?? 0) + v);
  }

  const nodes: DreHierarchyNode[] = [];
  for (const grupo of DRE_OPEX_GRUPO_ORDER) {
    const lines = byGrupo.get(grupo);
    if (!lines || lines.size === 0) continue;
    let grupoTotal = 0;
    const children: DreHierarchyNode[] = [];
    for (const def of DRE_DETALHE_DEFS.filter((d) => d.grupo === grupo)) {
      const valor = lines.get(def.codigo) ?? 0;
      if (valor === 0) continue;
      grupoTotal += valor;
      children.push({
        key: `opex:${grupo}:${def.codigo}`,
        label: def.label,
        valor,
        depth: 2,
        drillable: true,
        dreLinha: "despesas_operacionais",
        dreDetalhe: def.codigo,
        grupo,
      });
    }
    if (grupoTotal === 0) continue;
    nodes.push({
      key: `opex:${grupo}`,
      label: DRE_OPEX_GRUPO_LABELS[grupo],
      valor: grupoTotal,
      depth: 1,
      drillable: false,
      dreLinha: "despesas_operacionais",
      grupo,
      children,
    });
  }

  if (semDetalhe !== 0) {
    nodes.push({
      key: "opex:sem_detalhe",
      label: "Sem detalhe gerencial",
      valor: semDetalhe,
      depth: 1,
      drillable: true,
      dreLinha: "despesas_operacionais",
      dreDetalhe: "__none__",
      children: [],
    });
  }

  return nodes;
}

export function principalOpexGrupo(
  nodes: DreHierarchyNode[],
): { label: string; valor: number } | null {
  const ranked = nodes
    .filter((n) => n.key.startsWith("opex:") && n.key !== "opex:sem_detalhe")
    .sort((a, b) => b.valor - a.valor);
  const top = ranked[0];
  if (!top) return null;
  return { label: top.label, valor: top.valor };
}
