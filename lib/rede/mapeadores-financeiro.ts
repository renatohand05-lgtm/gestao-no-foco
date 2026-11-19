/**
 * Rede de lojas — tradução das linhas do banco (CMV, DRE, orçamento) para os tipos do app.
 * Puro (sem "server-only"): os testes importam direto, com dados sujos de propósito.
 */
import type { Cenario, CmvItem, CmvSemana, ConfigExpansao, LancamentoDre, LinhaDreKey, PremissasDreRow, StatusUnidade, UnidadeExpansao } from "./tipos.ts";

type Linha = Record<string, unknown>;
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0));
const numOuNull = (v: unknown): number | null => (v == null ? null : Number(v));
const origem = (v: unknown): "manual" | "exemplo" => (v === "exemplo" ? "exemplo" : "manual");
const LINHAS: readonly LinhaDreKey[] = ["impostos", "cmv", "folha", "delivery", "manutencao", "marketing", "cto", "agua", "energia"];

export function mapCmv(r: Linha): CmvSemana {
  return {
    id: String(r.id),
    lojaId: String(r.loja_id),
    semana: String(r.semana),
    vendas: numOuNull(r.vendas),
    cmvTeorico: num(r.cmv_teorico),
    estoqueInicial: num(r.estoque_inicial),
    compras: num(r.compras),
    transferenciasEntrada: num(r.transferencias_entrada),
    transferenciasSaida: num(r.transferencias_saida),
    devolucoes: num(r.devolucoes),
    estoqueFinal: num(r.estoque_final),
    responsavel: (r.responsavel as string | null) ?? null,
    observacoes: (r.observacoes as string | null) ?? null,
    origem: origem(r.origem),
  };
}

export function mapCmvItem(r: Linha): CmvItem {
  return { lojaId: String(r.loja_id), semana: String(r.semana), item: String(r.item), consumoTeorico: num(r.consumo_teorico), consumoReal: num(r.consumo_real) };
}

/** Só os campos preenchidos entram: campo vazio na linha da loja significa "usa o padrão da rede". */
export function mapPremissa(r: Linha): PremissasDreRow {
  const out: PremissasDreRow = { lojaId: (r.loja_id as string | null) ?? null };
  const campos: [keyof Linha & string, "cmv" | "pessoal" | "impostos" | "custoDelivery" | "manutencao" | "marketing" | "cto" | "agua" | "energia" | "mixDelivery"][] = [
    ["cmv", "cmv"],
    ["pessoal", "pessoal"],
    ["impostos", "impostos"],
    ["custo_delivery", "custoDelivery"],
    ["manutencao", "manutencao"],
    ["marketing", "marketing"],
    ["cto", "cto"],
    ["agua", "agua"],
    ["energia", "energia"],
    ["mix_delivery", "mixDelivery"],
  ];
  for (const [col, k] of campos) if (r[col] != null) out[k] = num(r[col]);
  if (r.base_delivery === "delivery" || r.base_delivery === "total") out.baseDelivery = r.base_delivery;
  return out;
}

export function mapLancamento(r: Linha): LancamentoDre {
  const linha = LINHAS.includes(r.linha as LinhaDreKey) ? (r.linha as LinhaDreKey) : "impostos";
  return {
    id: String(r.id),
    lojaId: String(r.loja_id),
    mes: String(r.mes),
    linha,
    valor: num(r.valor),
    observacao: (r.observacao as string | null) ?? null,
    origem: origem(r.origem),
  };
}

export function mapCenario(r: Linha): Cenario {
  const curva = Array.isArray(r.curva) ? (r.curva as unknown[]).map(num) : [];
  return {
    id: String(r.id),
    nome: String(r.nome),
    descricao: (r.descricao as string | null) ?? null,
    faturamento: num(r.faturamento),
    mixDelivery: num(r.mix_delivery),
    cmv: num(r.cmv),
    folha: num(r.folha),
    impostos: num(r.impostos),
    custoDelivery: num(r.custo_delivery),
    baseDelivery: r.base_delivery === "total" ? "total" : "delivery",
    manutencao: num(r.manutencao),
    marketing: num(r.marketing),
    cto: num(r.cto),
    agua: num(r.agua),
    energia: num(r.energia),
    curva,
    padrao: r.padrao === true,
    origem: origem(r.origem),
  };
}

export function mapUnidade(r: Linha): UnidadeExpansao {
  const status: StatusUnidade = r.status === "inaugurada" || r.status === "cancelada" ? r.status : "planejada";
  return {
    id: String(r.id),
    nome: String(r.nome),
    aberturaPrevista: (r.abertura_prevista as string | null) ?? null,
    status,
    cenarioId: (r.cenario_id as string | null) ?? null,
    lojaId: (r.loja_id as string | null) ?? null,
    faturamentoAlvo: numOuNull(r.faturamento_alvo),
    observacao: (r.observacao as string | null) ?? null,
    origem: origem(r.origem),
  };
}

export function mapConfigExpansao(r: Linha | null): ConfigExpansao | null {
  if (!r) return null;
  return {
    metaLojas: num(r.meta_lojas),
    faturamentoMinimo: num(r.faturamento_minimo),
    lojasBase: Array.isArray(r.lojas_base) ? (r.lojas_base as unknown[]).filter((x): x is string => typeof x === "string") : [],
  };
}
