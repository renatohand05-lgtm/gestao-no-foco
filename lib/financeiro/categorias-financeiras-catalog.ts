/**
 * Sprint 34.9 — Catálogo mínimo de categorias financeiras (despesa) para Contas a Pagar.
 * Aditivo/idempotente: reutiliza equivalentes por alias; não sobrescreve customizações.
 * Não define plano_conta_id automaticamente.
 */

import type { DespesaPresetId } from "@/lib/financeiro/despesa-presets";
import type { DreLinhaEconomica } from "@/lib/dre/dre-types";

export type CategoriaFinanceiraCatalogItem = {
  key: string;
  nome: string;
  tipo: "despesa";
  dre_linha: DreLinhaEconomica;
  dre_detalhe: string | null;
  aliases: readonly string[];
  /** Preset(s) 34.9 cobertos por esta categoria. */
  presetIds: readonly DespesaPresetId[];
  familia: string;
};

function n(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCategoriaNome(nome: string): string {
  return n(nome);
}

/** Catálogo mínimo CAP — nomes amigáveis + DRE existente. */
export const CONTAS_PAGAR_CATEGORIAS_CATALOG: readonly CategoriaFinanceiraCatalogItem[] =
  [
    {
      key: "salarios",
      nome: "Salários",
      tipo: "despesa",
      dre_linha: "despesas_pessoal",
      dre_detalhe: "pessoal_salarios",
      aliases: ["salario", "salarios", "folha", "folha salarial"],
      presetIds: ["salarios"],
      familia: "Pessoal",
    },
    {
      key: "prolabore",
      nome: "Pró-labore",
      tipo: "despesa",
      dre_linha: "despesas_pessoal",
      dre_detalhe: "pessoal_prolabore",
      aliases: ["pro labore", "prolabore", "pro-labore"],
      presetIds: ["prolabore"],
      familia: "Pessoal",
    },
    {
      key: "comissoes",
      nome: "Comissões",
      tipo: "despesa",
      dre_linha: "despesas_comerciais",
      dre_detalhe: "comercial_comissoes",
      aliases: ["comissao", "comissoes", "comissoes comerciais", "comissao comercial"],
      presetIds: ["comissoes"],
      familia: "Pessoal",
    },
    {
      key: "beneficios",
      nome: "Benefícios / encargos",
      tipo: "despesa",
      dre_linha: "despesas_pessoal",
      dre_detalhe: "pessoal_beneficios",
      aliases: [
        "beneficios",
        "encargos",
        "beneficios encargos",
        "beneficios / encargos",
      ],
      presetIds: [],
      familia: "Pessoal",
    },
    {
      key: "prestadores",
      nome: "Prestadores de serviço",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "manutencao_terceirizados",
      aliases: [
        "prestador",
        "prestadores",
        "prestadores de servico",
        "servicos de terceiros",
        "servico de terceiros",
        "terceiros",
        "terceirizados",
      ],
      presetIds: ["prestadores"],
      familia: "Serviços",
    },
    {
      key: "contabilidade",
      nome: "Contabilidade",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "manutencao_contabilidade",
      aliases: ["contabilidade", "contador", "escritorio contabil"],
      presetIds: ["contabilidade"],
      familia: "Serviços",
    },
    {
      key: "aluguel",
      nome: "Aluguel",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "locacao_aluguel",
      aliases: ["aluguel", "locacao", "aluguel do imovel"],
      presetIds: ["aluguel"],
      familia: "Ocupação",
    },
    {
      key: "condominio",
      nome: "Condomínio",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "locacao_condominio",
      aliases: ["condominio"],
      presetIds: ["condominio"],
      familia: "Ocupação",
    },
    {
      key: "energia",
      nome: "Energia elétrica",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "utilidades_energia",
      aliases: ["energia", "energia eletrica", "luz", "eletricidade"],
      presetIds: ["energia"],
      familia: "Utilidades",
    },
    {
      key: "agua",
      nome: "Água / saneamento",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "utilidades_agua",
      aliases: ["agua", "agua e saneamento", "agua / saneamento", "saneamento", "esgoto"],
      presetIds: ["agua"],
      familia: "Utilidades",
    },
    {
      key: "internet",
      nome: "Internet",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "utilidades_internet",
      aliases: ["internet", "banda larga", "fibra"],
      presetIds: ["internet"],
      familia: "Utilidades",
    },
    {
      key: "telefone",
      nome: "Telefonia",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "utilidades_telefonia",
      aliases: ["telefone", "telefonia", "celular"],
      presetIds: ["telefone"],
      familia: "Utilidades",
    },
    {
      key: "marketing",
      nome: "Marketing / publicidade",
      tipo: "despesa",
      dre_linha: "despesas_comerciais",
      dre_detalhe: "comercial_marketing",
      aliases: [
        "marketing",
        "publicidade",
        "propaganda",
        "marketing publicidade",
        "marketing / publicidade",
      ],
      presetIds: ["marketing"],
      familia: "Comercial",
    },
    {
      key: "royalties",
      nome: "Royalties",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "opex_outras",
      aliases: ["royalty", "royalties"],
      presetIds: ["royalties"],
      familia: "Comercial",
    },
    {
      key: "software",
      nome: "Software / assinaturas",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "tech_assinaturas",
      aliases: [
        "software",
        "assinatura",
        "assinaturas",
        "saas",
        "software assinaturas",
        "software / assinaturas",
        "licenca",
      ],
      presetIds: ["software"],
      familia: "Tecnologia",
    },
    {
      key: "combustivel",
      nome: "Combustível",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "admin_combustivel",
      aliases: ["combustivel", "gasolina", "diesel"],
      presetIds: ["combustivel"],
      familia: "Operação",
    },
    {
      key: "frete",
      nome: "Frete",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "admin_outras",
      aliases: ["frete", "transporte", "fretes"],
      presetIds: ["frete"],
      familia: "Operação",
    },
    {
      key: "manutencao",
      nome: "Manutenção",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "manutencao_outras",
      aliases: ["manutencao", "reparo", "reparos"],
      presetIds: ["manutencao"],
      familia: "Operação",
    },
    {
      key: "material_escritorio",
      nome: "Material de escritório",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "admin_escritorio",
      aliases: ["material de escritorio", "material escritorio", "escritorio"],
      presetIds: ["material_escritorio"],
      familia: "Operação",
    },
    {
      key: "material_consumo",
      nome: "Material de consumo",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "admin_outras",
      aliases: ["material de consumo", "material consumo"],
      presetIds: [],
      familia: "Operação",
    },
    {
      key: "impostos",
      nome: "Impostos / taxas",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "taxas_operacionais",
      aliases: [
        "imposto",
        "impostos",
        "taxa",
        "taxas",
        "tributo",
        "tributos",
        "impostos taxas",
        "impostos / taxas",
      ],
      presetIds: ["impostos"],
      familia: "Tributos",
    },
    {
      key: "seguros",
      nome: "Seguros",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "seguros_operacionais",
      aliases: ["seguro", "seguros"],
      presetIds: ["seguros"],
      familia: "Financeiro",
    },
    {
      key: "tarifas_bancarias",
      nome: "Tarifas bancárias",
      tipo: "despesa",
      dre_linha: "despesas_financeiras",
      dre_detalhe: null,
      aliases: [
        "tarifa bancaria",
        "tarifas bancarias",
        "tarifas bancárias",
        "tarifa",
        "tarifas",
      ],
      presetIds: ["tarifas_bancarias"],
      familia: "Financeiro",
    },
    {
      key: "outras",
      nome: "Outras despesas",
      tipo: "despesa",
      dre_linha: "despesas_operacionais",
      dre_detalhe: "opex_outras",
      aliases: ["outras", "outras despesas", "despesas diversas", "diversos"],
      presetIds: ["outras"],
      familia: "Outros",
    },
  ] as const;

export type CategoriaFinanceiraExisting = {
  id: string;
  nome: string;
  tipo?: string | null;
  dre_linha?: string | null;
};

export function existingCoversCategoriaCatalogItem(
  existing: CategoriaFinanceiraExisting,
  item: CategoriaFinanceiraCatalogItem,
): boolean {
  const tipo = (existing.tipo ?? "").toLowerCase();
  if (tipo && tipo !== "despesa" && tipo !== "ambos") return false;

  const nome = n(existing.nome);
  if (nome === n(item.nome)) return true;
  if (item.aliases.some((a) => n(a) === nome)) return true;

  // Match parcial seguro: alias contido no nome (ex.: "ENERGIA ELETRICA")
  if (item.aliases.some((a) => {
    const al = n(a);
    return al.length >= 4 && (nome.includes(al) || al.includes(nome));
  })) {
    return true;
  }

  return false;
}

export function missingContasPagarCategorias(
  existing: CategoriaFinanceiraExisting[],
): CategoriaFinanceiraCatalogItem[] {
  return CONTAS_PAGAR_CATEGORIAS_CATALOG.filter(
    (item) =>
      !existing.some((row) => existingCoversCategoriaCatalogItem(row, item)),
  );
}

/** Verifica se atalho encontra categoria no catálogo/tenant. */
export function findCategoriaForPreset(
  presetId: DespesaPresetId,
  existing: CategoriaFinanceiraExisting[],
): CategoriaFinanceiraExisting | CategoriaFinanceiraCatalogItem | null {
  const item = CONTAS_PAGAR_CATEGORIAS_CATALOG.find((c) =>
    c.presetIds.includes(presetId),
  );
  if (!item) return null;
  const hit = existing.find((row) =>
    existingCoversCategoriaCatalogItem(row, item),
  );
  return hit ?? item;
}
