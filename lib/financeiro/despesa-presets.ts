/**
 * Sprint 34.9 — Presets de despesa rápida (templates de classificação).
 * Não cria lançamentos nem entidades. Resolve IDs só por match no catálogo do tenant.
 */

import type { BeneficiarioTipo } from "@/lib/financeiro/beneficiario-types";

export type DespesaPresetId =
  | "salarios"
  | "prolabore"
  | "comissoes"
  | "prestadores"
  | "aluguel"
  | "condominio"
  | "energia"
  | "agua"
  | "internet"
  | "telefone"
  | "contabilidade"
  | "royalties"
  | "marketing"
  | "software"
  | "combustivel"
  | "frete"
  | "manutencao"
  | "material_escritorio"
  | "impostos"
  | "seguros"
  | "tarifas_bancarias"
  | "outras";

export type DespesaPreset = {
  id: DespesaPresetId;
  label: string;
  descricaoSugerida: string;
  /** Tipo de beneficiário sugerido (usuário confirma). */
  beneficiarioTipoSugerido: BeneficiarioTipo;
  /** Patterns para match em categorias_financeiras.nome (já normalizado). */
  categoriaPatterns: RegExp[];
  /** Patterns para match em plano_contas.nome|codigo. */
  planoPatterns: RegExp[];
  /** Preferência de dre_linha se nome não bater. */
  dreLinhaPreferida?: string;
};

function n(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const DESPESA_PRESETS: readonly DespesaPreset[] = [
  {
    id: "salarios",
    label: "Salários",
    descricaoSugerida: "Salário",
    beneficiarioTipoSugerido: "funcionario",
    categoriaPatterns: [/salario/, /folha/, /pessoal/],
    planoPatterns: [/salario/, /folha/, /pessoal/],
    dreLinhaPreferida: "despesas_pessoal",
  },
  {
    id: "prolabore",
    label: "Pró-labore",
    descricaoSugerida: "Pró-labore",
    beneficiarioTipoSugerido: "funcionario",
    categoriaPatterns: [/pro.?labore/, /prolabore/],
    planoPatterns: [/pro.?labore/, /prolabore/],
    dreLinhaPreferida: "despesas_pessoal",
  },
  {
    id: "comissoes",
    label: "Comissões",
    descricaoSugerida: "Comissão",
    beneficiarioTipoSugerido: "vendedor",
    categoriaPatterns: [/comissao/, /comissoes/],
    planoPatterns: [/comissao/, /comissoes/],
    dreLinhaPreferida: "despesas_comerciais",
  },
  {
    id: "prestadores",
    label: "Prestadores de serviço",
    descricaoSugerida: "Serviço de terceiros",
    beneficiarioTipoSugerido: "prestador",
    categoriaPatterns: [/prestador/, /terceir/, /servico/],
    planoPatterns: [/prestador/, /terceir/, /servico/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "aluguel",
    label: "Aluguel",
    descricaoSugerida: "Aluguel",
    beneficiarioTipoSugerido: "locador",
    categoriaPatterns: [/aluguel/, /locacao/],
    planoPatterns: [/aluguel/, /locacao/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "condominio",
    label: "Condomínio",
    descricaoSugerida: "Condomínio",
    beneficiarioTipoSugerido: "outro",
    categoriaPatterns: [/condominio/],
    planoPatterns: [/condominio/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "energia",
    label: "Energia elétrica",
    descricaoSugerida: "Energia elétrica",
    beneficiarioTipoSugerido: "concessionaria",
    categoriaPatterns: [/energia/, /eletrica/, /luz/],
    planoPatterns: [/energia/, /eletrica/, /luz/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "agua",
    label: "Água / saneamento",
    descricaoSugerida: "Água e saneamento",
    beneficiarioTipoSugerido: "concessionaria",
    categoriaPatterns: [/agua/, /saneamento/],
    planoPatterns: [/agua/, /saneamento/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "internet",
    label: "Internet",
    descricaoSugerida: "Internet",
    beneficiarioTipoSugerido: "concessionaria",
    categoriaPatterns: [/internet/, /banda.?larga/],
    planoPatterns: [/internet/, /banda.?larga/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "telefone",
    label: "Telefone",
    descricaoSugerida: "Telefone",
    beneficiarioTipoSugerido: "concessionaria",
    categoriaPatterns: [/telefone/, /telefonia/, /celular/],
    planoPatterns: [/telefone/, /telefonia/, /celular/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "contabilidade",
    label: "Contabilidade",
    descricaoSugerida: "Contabilidade",
    beneficiarioTipoSugerido: "prestador",
    categoriaPatterns: [/contabil/, /contador/],
    planoPatterns: [/contabil/, /contador/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "royalties",
    label: "Royalties",
    descricaoSugerida: "Royalties",
    beneficiarioTipoSugerido: "outro",
    categoriaPatterns: [/royalt/],
    planoPatterns: [/royalt/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "marketing",
    label: "Marketing / publicidade",
    descricaoSugerida: "Marketing / publicidade",
    beneficiarioTipoSugerido: "prestador",
    categoriaPatterns: [/marketing/, /publicidade/, /propaganda/],
    planoPatterns: [/marketing/, /publicidade/, /propaganda/],
    dreLinhaPreferida: "despesas_comerciais",
  },
  {
    id: "software",
    label: "Software / assinaturas",
    descricaoSugerida: "Software / assinatura",
    beneficiarioTipoSugerido: "fornecedor",
    categoriaPatterns: [/software/, /assinatura/, /saas/, /licenca/],
    planoPatterns: [/software/, /assinatura/, /saas/, /licenca/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "combustivel",
    label: "Combustível",
    descricaoSugerida: "Combustível",
    beneficiarioTipoSugerido: "fornecedor",
    categoriaPatterns: [/combustivel/, /gasolina/, /diesel/],
    planoPatterns: [/combustivel/, /gasolina/, /diesel/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "frete",
    label: "Frete",
    descricaoSugerida: "Frete",
    beneficiarioTipoSugerido: "fornecedor",
    categoriaPatterns: [/frete/, /transporte/],
    planoPatterns: [/frete/, /transporte/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "manutencao",
    label: "Manutenção",
    descricaoSugerida: "Manutenção",
    beneficiarioTipoSugerido: "prestador",
    categoriaPatterns: [/manutencao/, /reparo/],
    planoPatterns: [/manutencao/, /reparo/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "material_escritorio",
    label: "Material de escritório",
    descricaoSugerida: "Material de escritório",
    beneficiarioTipoSugerido: "fornecedor",
    categoriaPatterns: [/material/, /escritorio/, /consumo/],
    planoPatterns: [/material/, /escritorio/, /consumo/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "impostos",
    label: "Impostos / taxas",
    descricaoSugerida: "Impostos / taxas",
    beneficiarioTipoSugerido: "governo",
    categoriaPatterns: [/imposto/, /taxa/, /tributo/],
    planoPatterns: [/imposto/, /taxa/, /tributo/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "seguros",
    label: "Seguros",
    descricaoSugerida: "Seguro",
    beneficiarioTipoSugerido: "fornecedor",
    categoriaPatterns: [/seguro/],
    planoPatterns: [/seguro/],
    dreLinhaPreferida: "despesas_operacionais",
  },
  {
    id: "tarifas_bancarias",
    label: "Tarifas bancárias",
    descricaoSugerida: "Tarifa bancária",
    beneficiarioTipoSugerido: "outro",
    categoriaPatterns: [/tarifa/, /bancari/, /banco/],
    planoPatterns: [/tarifa/, /bancari/],
    dreLinhaPreferida: "despesas_financeiras",
  },
  {
    id: "outras",
    label: "Outras despesas",
    descricaoSugerida: "Outras despesas",
    beneficiarioTipoSugerido: "outro",
    categoriaPatterns: [/outr/],
    planoPatterns: [/outr/],
    dreLinhaPreferida: "despesas_operacionais",
  },
] as const;

export type CatalogItem = {
  id: string;
  nome: string;
  codigo?: string | null;
  dre_linha?: string | null;
};

export type ResolvedDespesaPreset = {
  preset: DespesaPreset;
  categoriaId: string | null;
  planoContaId: string | null;
  classificacaoPendente: boolean;
  matchReason: string;
};

function matchByPatterns(
  items: CatalogItem[],
  patterns: RegExp[],
): CatalogItem | null {
  for (const item of items) {
    const hay = n(`${item.codigo ?? ""} ${item.nome}`);
    if (patterns.some((p) => p.test(hay))) return item;
  }
  return null;
}

function matchByDre(
  items: CatalogItem[],
  dreLinha: string | undefined,
): CatalogItem | null {
  if (!dreLinha) return null;
  const hits = items.filter((i) => i.dre_linha === dreLinha);
  return hits.length === 1 ? hits[0]! : null;
}

/** Resolve preset contra catálogo do tenant — sem inventar IDs. */
export function resolveDespesaPreset(
  presetId: DespesaPresetId,
  categorias: CatalogItem[],
  planos: CatalogItem[],
): ResolvedDespesaPreset | null {
  const preset = DESPESA_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;

  const catByName = matchByPatterns(categorias, preset.categoriaPatterns);
  const catByDre =
    catByName ?? matchByDre(categorias, preset.dreLinhaPreferida);
  const planoByName = matchByPatterns(planos, preset.planoPatterns);
  const planoByDre =
    planoByName ?? matchByDre(planos, preset.dreLinhaPreferida);

  const categoriaId = catByDre?.id ?? null;
  const planoContaId = planoByDre?.id ?? null;
  const classificacaoPendente = !categoriaId || !planoContaId;

  const reasons: string[] = [];
  if (categoriaId) reasons.push(`categoria: ${catByDre!.nome}`);
  else reasons.push("categoria: pendente");
  if (planoContaId) reasons.push(`plano: ${planoByDre!.nome}`);
  else reasons.push("plano: pendente");

  return {
    preset,
    categoriaId,
    planoContaId,
    classificacaoPendente,
    matchReason: reasons.join(" · "),
  };
}
